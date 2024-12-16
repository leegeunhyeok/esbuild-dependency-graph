import * as path from 'node:path';
import type { Metafile } from 'esbuild';
import { createModule, isExternal } from './helpers';
import { assertValue } from './utils';
import {
  type InternalModule,
  type Module,
  type ModuleMeta,
  type RelativePath,
} from './types';
import { toModule } from './helpers/to-module';

type ModuleDependencyGraph = Record<number, InternalModule | undefined>;

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
      const relativePath = modulePath as RelativePath;
      const moduleId = this.getModuleId(relativePath);
      const imports = metafile.inputs[modulePath]?.imports ?? [];

      const currentModule =
        moduleId == null
          ? this.INTERNAL__createModule(relativePath, { imports: {} })
          : this.INTERNAL__getModule(relativePath);

      if (isExternal(currentModule)) {
        continue;
      }

      // Link with dependencies
      for (const importMeta of imports) {
        const dependencyRelativePath = importMeta.path as RelativePath;
        const dependencyModuleId = this.getModuleId(dependencyRelativePath);
        const dependencyModule =
          dependencyModuleId == null
            ? this.INTERNAL__createModule(dependencyRelativePath, {
                imports: {},
              })
            : this.INTERNAL__getModule(dependencyRelativePath);

        if (importMeta.original != null) {
          currentModule.meta.imports[importMeta.original] = {
            id: dependencyModule.id,
            path: dependencyModule.path,
          };
        }

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

  private INTERNAL__createModule(
    relativePath: RelativePath,
    meta: ModuleMeta,
  ): InternalModule {
    const newModuleId = this.generateUniqueModuleId(relativePath);
    const newModule = createModule(newModuleId, relativePath, meta);

    this.graphSize++;

    return (this.dependencyGraph[newModule.id] = newModule);
  }

  /**
   * Link the dependency relationship between the two modules.
   */
  private linkModules(
    sourceModule: InternalModule,
    targetModule: InternalModule,
  ): void {
    sourceModule.dependencies.add(targetModule.id);
    targetModule.dependents.add(sourceModule.id);
  }

  /**
   * Remove the module and unlink the dependency relationship.
   */
  private unlinkModule(sourceModule: InternalModule, unlinkOnly = false): void {
    const moduleId = sourceModule.id;

    sourceModule.dependencies.forEach((dependencyId) => {
      const dependencyModule = this.INTERNAL__getModule(dependencyId);

      dependencyModule.dependents.delete(moduleId);
    });

    sourceModule.dependents.forEach((dependentId) => {
      const dependentModule = this.INTERNAL__getModule(dependentId);

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

  private INTERNAL__getModule(request: string | number): InternalModule {
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
    const module = assertValue(
      this.dependencyGraph[moduleId],
      `module not found (id: ${String(moduleId)})`,
    );

    return module;
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
   * Check if the module exists.
   */
  hasModule(request: string | number): boolean {
    try {
      this.INTERNAL__getModule(request);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get module data by module path.
   */
  getModule(request: string | number): Module {
    const module = this.INTERNAL__getModule(request);

    return toModule(module);
  }

  /**
   * Register new module to dependency graph.
   */
  addModule(
    path: string,
    {
      dependencies = [],
      dependents = [],
      meta,
    }: {
      dependencies: (string | number)[];
      dependents: (string | number)[];
      meta: ModuleMeta;
    },
  ): Module {
    const relativePath = this.toRelativePath(path);

    if (typeof this.getModuleId(relativePath) === 'number') {
      throw new Error(`already registered: '${path}'`);
    }

    // Validate that the IDs of modules are registered.
    const dependencyModules = dependencies.map((dependencyPath) =>
      this.INTERNAL__getModule(dependencyPath),
    );
    const dependentModules = dependents.map((dependentPath) =>
      this.INTERNAL__getModule(dependentPath),
    );
    const newModule = this.INTERNAL__createModule(relativePath, meta);

    dependencyModules.forEach((module) => {
      newModule.dependencies.add(module.id);
      this.linkModules(newModule, module);
    });

    dependentModules.forEach((module) => {
      newModule.dependents.add(module.id);
      this.linkModules(module, newModule);
    });

    return toModule(newModule);
  }

  /**
   * Update registered module.
   */
  updateModule(
    request: string | number,
    {
      dependencies = [],
      dependents = [],
      meta,
    }: {
      dependencies: (string | number)[];
      dependents: (string | number)[];
      meta: ModuleMeta;
    },
  ): Module {
    const targetModule = this.INTERNAL__getModule(request);

    // Validate that the IDs of modules are registered.
    const dependencyModules = dependencies.map((dependencyPath) =>
      this.INTERNAL__getModule(dependencyPath),
    );
    const dependentModules = dependents.map((dependentPath) =>
      this.INTERNAL__getModule(dependentPath),
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

    targetModule.meta = meta;

    return toModule(targetModule);
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
