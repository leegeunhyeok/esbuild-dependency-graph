import * as path from 'node:path';
import type { Metafile } from 'esbuild';
import { createModule, isExternal } from './helpers';
import { assertValue } from './utils';
import type { Module, RelativePath } from './types';

type ModuleDependencyGraph = Record<number, Module | undefined>;

interface DependencyGraphOptions {
  /**
   * Root path for lookup modules.
   *
   * Defaults to `process.cwd()`.
   */
  root?: string;
}

export class DependencyGraph {
  private dependencyGraph: ModuleDependencyGraph = {};
  private INTERNAL__moduleIds: Record<string, number | undefined> = {};
  private INTERNAL__moduleId = 0;
  private graphSize = 0;
  private options: Required<DependencyGraphOptions>;

  get size(): number {
    return this.graphSize;
  }

  constructor(options?: DependencyGraphOptions) {
    this.options = { root: process.cwd(), ...options };
  }

  /**
   * Generate a dependency graph based on the meta file.
   */
  private generateDependencyGraph(metafile: Metafile): void {
    for (const modulePath in metafile.inputs) {
      // esbuild's paths are relative path.
      const currentModule = this.getOrCreateModule(modulePath as RelativePath);
      const imports = metafile.inputs[modulePath]?.imports ?? [];

      if (isExternal(currentModule)) {
        continue;
      }

      for (const importMeta of imports) {
        const dependencyModule = this.getOrCreateModule(
          importMeta.path as RelativePath,
          importMeta.external,
        );
        this.linkModules(currentModule, dependencyModule);
      }
    }
  }

  /**
   * Generate unique id for module.
   *
   * If already has id for path return cached id
   * else generate new one.
   */
  private generateUniqueModuleId(modulePath: string): number {
    return (
      this.INTERNAL__moduleIds[modulePath] ??
      (() => {
        return (this.INTERNAL__moduleIds[modulePath] = this
          .INTERNAL__moduleId++);
      })()
    );
  }

  /**
   * Convert to relative path based on root.
   */
  private toRelativePath(targetPath: string): RelativePath {
    return (
      path.isAbsolute(targetPath)
        ? path.relative(this.options.root, targetPath)
        : targetPath
    ) as RelativePath;
  }

  /**
   * Get module id
   */
  private getModuleId(relativePath: RelativePath): number | null {
    let id: number | undefined;

    return typeof (id = this.INTERNAL__moduleIds[relativePath]) === 'number' &&
      id in this.dependencyGraph
      ? id
      : null;
  }

  /**
   * Get the module by its actual path in the metafile,
   * or return the existing module if it's already in the graph.
   */
  private getOrCreateModule(
    relativePath: RelativePath,
    external = false,
  ): Module {
    const id = this.getModuleId(relativePath);

    if (typeof id === 'number') {
      // Returns exist module.
      return this.dependencyGraph[id]!;
    }

    const newModuleId = this.generateUniqueModuleId(relativePath);
    const newModule = createModule(newModuleId, relativePath, external);

    this.graphSize++;

    return (this.dependencyGraph[newModule.id] = newModule);
  }

  /**
   * Link the dependency relationship between the two modules.
   */
  private linkModules(sourceModule: Module, targetModule: Module): void {
    sourceModule.dependencies.add(targetModule.id);
    targetModule.dependents.add(sourceModule.id);
  }

  /**
   * Remove the module and unlink the dependency relationship.
   */
  unlinkModule(sourceModule: Module, unlinkOnly = false): void {
    const moduleId = sourceModule.id;

    sourceModule.dependencies.forEach((dependencyId) => {
      const dependencyModule = this.getModule(dependencyId);

      dependencyModule.dependents.delete(moduleId);
    });

    sourceModule.dependents.forEach((dependentId) => {
      const dependentModule = this.getModule(dependentId);

      dependentModule.dependencies.delete(moduleId);
    });

    sourceModule.dependencies.clear();
    sourceModule.dependents.clear();

    if (!unlinkOnly) {
      this.dependencyGraph[moduleId] = undefined;
      this.INTERNAL__moduleIds[sourceModule.path] = undefined;
    }
  }

  /**
   * Traverse modules for get invert dependencies.
   */
  private traverseInverseModules(moduleId: number): number[] {
    const queue: number[] = [moduleId];
    const visited: Record<number, boolean> = { [moduleId]: true };
    const inverseModuleIds: number[] = [];

    while (queue.length) {
      const currentModuleId = queue.shift()!;
      const module = this.dependencyGraph[currentModuleId];

      if (currentModuleId !== moduleId) {
        inverseModuleIds.push(currentModuleId);
      }

      module?.dependents.forEach((inverseModuleId) => {
        if (visited[inverseModuleId]) {
          return;
        }

        visited[inverseModuleId] = true;
        queue.push(inverseModuleId);
      });
    }

    return inverseModuleIds;
  }

  private INTERNAL__getModule(request: string | number): Module {
    let moduleId: number;

    if (typeof request === 'number') {
      moduleId = request;
    } else {
      const relativePath = this.toRelativePath(request);
      moduleId = assertValue(
        this.getModuleId(relativePath),
        `module not found: '${request}'`,
      );
    }

    return assertValue(
      this.dependencyGraph[moduleId],
      `module not found (id: ${moduleId})`,
    );
  }

  /**
   * Generate or update the dependency graph using the esbuild metafile.
   */
  load(metafile: string | Metafile): this {
    this.generateDependencyGraph(
      typeof metafile === 'string'
        ? (JSON.parse(metafile) as Metafile)
        : metafile,
    );

    return this;
  }

  /**
   * Reset dependency graph.
   */
  reset(): void {
    this.INTERNAL__moduleId = 0;
    this.INTERNAL__moduleIds = {};
    this.dependencyGraph = {};
  }

  /**
   * Get module information by module path
   */
  getModule(request: string | number): Module {
    return this.INTERNAL__getModule(request);
  }

  /**
   * Register new module to dependency graph.
   */
  addModule(
    modulePath: string,
    dependencies: (string | number)[] = [],
    dependents: (string | number)[] = [],
  ): Module {
    const relativePath = this.toRelativePath(modulePath);

    if (typeof this.getModuleId(relativePath) === 'number') {
      throw new Error(`already registered: '${modulePath}'`);
    }

    // Validate that the IDs of modules are registered.
    const dependencyModules = dependencies.map((dependencyPath) =>
      this.getModule(dependencyPath),
    );
    const dependentModules = dependents.map((dependentPath) =>
      this.getModule(dependentPath),
    );

    const newModule = this.getOrCreateModule(relativePath);

    dependencyModules.forEach((module) => {
      newModule.dependencies.add(module.id);
      this.linkModules(newModule, module);
    });

    dependentModules.forEach((module) => {
      newModule.dependents.add(module.id);
      this.linkModules(module, newModule);
    });

    return newModule;
  }

  /**
   * Update registered module.
   */
  updateModule(
    request: string | number,
    dependencies: (string | number)[] = [],
    dependents: (string | number)[] = [],
  ): Module {
    const targetModule = this.getModule(request);

    // Validate that the IDs of modules are registered.
    const dependencyModules = dependencies.map((dependencyPath) =>
      this.getModule(dependencyPath),
    );
    const dependentModules = dependents.map((dependentPath) =>
      this.getModule(dependentPath),
    );

    this.unlinkModule(targetModule, true);

    dependencyModules.forEach((module) => {
      targetModule.dependencies.add(module.id);
      this.linkModules(targetModule, module);
    });

    dependentModules.forEach((module) => {
      targetModule.dependents.add(module.id);
      this.linkModules(module, targetModule);
    });

    return targetModule;
  }

  /**
   * Remove module from graph.
   */
  removeModule(request: string | number): void {
    const module = this.INTERNAL__getModule(request);

    this.unlinkModule(module);
    this.graphSize--;
  }

  /**
   * Get dependencies of specified module.
   */
  dependenciesOf(request: string | number): Module[] {
    const module = this.INTERNAL__getModule(request);

    return Array.from(module.dependencies).map((id) => this.getModule(id));
  }

  /**
   * Get dependents of specified module.
   */
  dependentsOf(request: string | number): Module[] {
    const module = this.INTERNAL__getModule(request);

    return Array.from(module.dependents).map((id) => this.getModule(id));
  }

  /**
   * Get inverse dependencies of specified module.
   */
  inverseDependenciesOf(request: string | number): Module[] {
    const module = this.INTERNAL__getModule(request);

    return this.traverseInverseModules(module.id).map((id) =>
      this.getModule(id),
    );
  }
}
