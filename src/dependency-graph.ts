import * as path from 'node:path';
import type { Metafile } from 'esbuild';
import { createModule, isExternal } from './helpers';
import { assertValue } from './utils';
import type { Module, ModuleId, ModulePath, RelativePath } from './types';

type ModuleDependencyGraph = Record<ModuleId, Module | undefined>;

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
  private INTERNAL__moduleIds: Record<ModulePath, number | undefined> = {};
  private INTERNAL__moduleId = 0;
  private graphSize = 0;
  private options: Required<DependencyGraphOptions>;

  get size(): number {
    return this.graphSize;
  }

  constructor(metafile?: string | Metafile, options?: DependencyGraphOptions) {
    this.options = { root: process.cwd(), ...options };

    if (metafile) {
      this.generateDependencyGraph(
        typeof metafile === 'string'
          ? (JSON.parse(metafile) as Metafile)
          : metafile,
      );
    }
  }

  /**
   * Generate a dependency graph based on the meta file.
   */
  private generateDependencyGraph(metafile: Metafile): void {
    for (const modulePath in metafile.inputs) {
      // esbuild's paths are relative path.
      const currentModule = this.createModule(modulePath as RelativePath);
      const imports = metafile.inputs[modulePath]?.imports ?? [];

      if (isExternal(currentModule)) {
        continue;
      }

      for (const importMeta of imports) {
        const dependencyModule = this.createModule(
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
  private getModuleId(relativePath: RelativePath): ModuleId | null {
    let id: ModuleId | undefined;

    return typeof (id = this.INTERNAL__moduleIds[relativePath]) === 'number' &&
      id in this.dependencyGraph
      ? id
      : null;
  }

  /**
   * Get module by actual path in metafile.
   */
  private createModule(relativePath: RelativePath, external = false): Module {
    const id = this.getModuleId(relativePath);

    if (typeof id === 'number') {
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
      const dependencyModule = this.getModuleById(dependencyId);

      dependencyModule.dependents.delete(moduleId);
    });

    sourceModule.dependents.forEach((dependentId) => {
      const dependentModule = this.getModuleById(dependentId);

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
  private traverseInverseModules(moduleId: ModuleId): ModuleId[] {
    const queue: ModuleId[] = [moduleId];
    const visited: Record<ModuleId, boolean> = { [moduleId]: true };
    const inverseModuleIds: ModuleId[] = [];

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

  /**
   * Get module information by module path
   */
  getModule(modulePath: string): Module {
    const relativePath = this.toRelativePath(modulePath);
    const moduleId = assertValue(
      this.getModuleId(relativePath),
      `module not found: '${modulePath}'`,
    );

    return this.getModuleById(moduleId);
  }

  /**
   * Get module by id.
   */
  getModuleById(moduleId: ModuleId): Module {
    return assertValue(
      this.dependencyGraph[moduleId],
      `module not found (id: ${moduleId})`,
    );
  }

  /**
   * Register new module to dependency graph.
   */
  addModule(
    modulePath: string,
    dependencies: ModulePath[] = [],
    dependents: ModulePath[] = [],
  ): void {
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

    const newModule = this.createModule(relativePath);

    dependencyModules.forEach((module) => {
      newModule.dependencies.add(module.id);
      this.linkModules(newModule, module);
    });

    dependentModules.forEach((module) => {
      newModule.dependents.add(module.id);
      this.linkModules(module, newModule);
    });
  }

  /**
   * Update registered module.
   */
  updateModule(
    modulePath: string,
    dependencies: ModulePath[] = [],
    dependents: ModulePath[] = [],
  ): void {
    const targetModule = this.getModule(modulePath);

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
  }

  /**
   * Remove module from graph.
   */
  removeModule(modulePath: string): void {
    const relativePath = this.toRelativePath(modulePath);
    const moduleId = assertValue(
      this.getModuleId(relativePath),
      `module not found: '${modulePath}'`,
    );
    const module = this.getModuleById(moduleId);

    this.unlinkModule(module);
    this.graphSize--;
  }

  /**
   * Get dependencies of specified module.
   */
  dependenciesOf(modulePath: string): ModulePath[] {
    const relativePath = this.toRelativePath(modulePath);
    const moduleId = assertValue(
      this.getModuleId(relativePath),
      `module not found: '${modulePath}'`,
    );
    const module = this.getModuleById(moduleId);

    return Array.from(module.dependencies).map(
      (id) => this.getModuleById(id).path,
    );
  }

  /**
   * Get dependents of specified module.
   */
  dependentsOf(modulePath: string): ModulePath[] {
    const relativePath = this.toRelativePath(modulePath);
    const moduleId = assertValue(
      this.getModuleId(relativePath),
      `module not found: '${modulePath}'`,
    );
    const module = this.getModuleById(moduleId);

    return Array.from(module.dependents).map(
      (id) => this.getModuleById(id).path,
    );
  }

  /**
   * Get inverse dependencies of specified module.
   */
  inverseDependenciesOf(modulePath: string): ModulePath[] {
    const relativePath = this.toRelativePath(modulePath);
    const moduleId = assertValue(
      this.getModuleId(relativePath),
      `module not found: '${modulePath}'`,
    );

    return this.traverseInverseModules(moduleId).map(
      (id) => this.getModuleById(id).path,
    );
  }

  /**
   * Reset dependency graph.
   */
  reset(metafile?: string | Metafile): void {
    this.INTERNAL__moduleId = 0;
    this.INTERNAL__moduleIds = {};
    this.dependencyGraph = {};

    if (metafile) {
      this.generateDependencyGraph(
        typeof metafile === 'string'
          ? (JSON.parse(metafile) as Metafile)
          : metafile,
      );
    }
  }
}
