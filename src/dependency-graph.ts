import * as path from 'node:path';
import type { Metafile } from 'esbuild';
import { createModule } from './helpers';
import { assertValue } from './utils';
import type {
  ModuleMeta,
  ModuleQueryKey,
  InternalModule,
  Module,
  AbsolutePath,
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
      // Paths in esbuild metafile are relative path.
      const absolutePath = this.toAbsolutePath(modulePath);
      const moduleId = this.getModuleId(absolutePath);
      const imports = metafile.inputs[modulePath]?.imports ?? [];

      const currentModule =
        moduleId == null
          ? this.INTERNAL__createModule(absolutePath)
          : this.INTERNAL__getModule(absolutePath);

      // Link with dependencies
      for (const importMeta of imports) {
        if (importMeta.external) {
          continue;
        }

        const dependencyAbsolutePath = this.toAbsolutePath(importMeta.path);
        const dependencySource = assertValue(
          importMeta.original,
          `internal module must have 'original' value`,
        );
        const dependencyModuleId = this.getModuleId(dependencyAbsolutePath);
        const dependencyModule =
          dependencyModuleId == null
            ? this.INTERNAL__createModule(dependencyAbsolutePath)
            : this.INTERNAL__getModule(dependencyAbsolutePath);

        this.linkModules(currentModule, dependencyModule, {
          source: dependencySource,
        });
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
   * Convert to absolute path based on root.
   */
  private toAbsolutePath(targetPath: string): AbsolutePath {
    return (
      path.isAbsolute(targetPath)
        ? targetPath
        : path.resolve(this.options.root, targetPath)
    ) as AbsolutePath;
  }

  /**
   * Get module id
   */
  private getModuleId(absolutePath: AbsolutePath): number | null {
    let id: number | undefined;

    return typeof (id = this.INTERNAL__moduleIds[absolutePath]) === 'number' &&
      id in this.dependencyGraph
      ? id
      : null;
  }

  private INTERNAL__createModule(absolutePath: AbsolutePath): InternalModule {
    const newModuleId = this.generateUniqueModuleId(absolutePath);
    const newModule = createModule(newModuleId, absolutePath);

    this.graphSize++;

    return (this.dependencyGraph[newModule.id] = newModule);
  }

  /**
   * Link the dependency relationship between the two modules.
   */
  private linkModules(
    sourceModule: InternalModule,
    targetModule: InternalModule,
    meta: ModuleMeta,
  ): void {
    sourceModule.dependencies[targetModule.id] = meta.source;
    targetModule.dependents.add(sourceModule.id);
  }

  /**
   * Remove the module and unlink the dependency relationship.
   */
  private unlinkModule(sourceModule: InternalModule, unlinkOnly = false): void {
    const moduleId = sourceModule.id;

    Object.keys(sourceModule.dependencies).forEach((dependencyId) => {
      const dependencyModule = this.INTERNAL__getModule(
        parseInt(dependencyId, 10),
      );

      dependencyModule.dependents.delete(moduleId);
    });

    sourceModule.dependents.forEach((dependentId) => {
      const dependentModule = this.INTERNAL__getModule(dependentId);

      delete dependentModule.dependencies[moduleId];
    });

    sourceModule.dependencies = {};
    sourceModule.dependents.clear();

    if (unlinkOnly) return;

    delete this.dependencyGraph[moduleId];
    delete this.INTERNAL__moduleIds[sourceModule.path];
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

  private INTERNAL__getModule(key: ModuleQueryKey): InternalModule {
    let moduleId: number;

    if (typeof key === 'number') {
      moduleId = key;
    } else {
      const absolutePath = this.toAbsolutePath(key);
      moduleId = assertValue(
        this.getModuleId(absolutePath),
        `module not found (key: ${key})`,
      );
    }

    return assertValue(
      this.dependencyGraph[moduleId],
      `module not found (id: ${String(moduleId)})`,
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
   * Set options for dependency graph.
   */
  setOptions(options: DependencyGraphOptions): void {
    this.options = { ...this.options, ...options };
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
  hasModule(key: ModuleQueryKey): boolean {
    try {
      this.INTERNAL__getModule(key);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get module data by module path.
   */
  getModule(key: ModuleQueryKey): Module {
    const module = this.INTERNAL__getModule(key);

    return toModule(module);
  }

  /**
   * Register new module to dependency graph.
   */
  addModule(
    path: string,
    {
      dependencies,
    }: {
      dependencies: {
        key: ModuleQueryKey;
        source: string;
      }[];
    },
  ): Module {
    const absolutePath = this.toAbsolutePath(path);
    const moduleId = this.getModuleId(absolutePath);

    if (typeof moduleId === 'number') {
      throw new Error(`already registered (id: ${moduleId})`);
    }

    // Validate that the IDs of modules are registered in the graph.
    const dependencyModules = dependencies.map((dependency) => {
      return {
        module: this.INTERNAL__getModule(dependency.key),
        meta: { source: dependency.source },
      };
    });

    const newModule = this.INTERNAL__createModule(absolutePath);

    dependencyModules.forEach(({ module, meta }) => {
      this.linkModules(newModule, module, meta);
    });

    return toModule(newModule);
  }

  /**
   * Update registered module.
   */
  updateModule(
    key: ModuleQueryKey,
    {
      dependencies,
    }: {
      dependencies: {
        key: ModuleQueryKey;
        source: string;
      }[];
    },
  ): Module {
    const targetModule = this.INTERNAL__getModule(key);
    const prevDependents = Array.from(targetModule.dependents);

    // Validate that the IDs of modules are registered.
    const dependencyModules = dependencies.map((dependency) => ({
      module: this.INTERNAL__getModule(dependency.key),
      meta: { source: dependency.source },
    }));
    const dependentModules = prevDependents.map((dependentId) => {
      const dependentModule = this.INTERNAL__getModule(dependentId);
      const dependentSource = dependentModule.dependencies[targetModule.id];

      return {
        module: dependentModule,
        meta: {
          source: assertValue(
            dependentSource,
            `'${dependentModule.toString()}' module is not dependent on '${targetModule.toString()}'`,
          ),
        },
      };
    });

    this.unlinkModule(targetModule, true);

    dependencyModules.forEach(({ module, meta }) => {
      targetModule.dependencies[module.id] = meta.source;
      this.linkModules(targetModule, module, meta);
    });

    dependentModules.forEach(({ module, meta }) => {
      targetModule.dependents.add(module.id);
      this.linkModules(module, targetModule, meta);
    });

    return toModule(targetModule);
  }

  /**
   * Remove module from graph.
   */
  removeModule(key: ModuleQueryKey): void {
    const module = this.INTERNAL__getModule(key);

    this.unlinkModule(module);
    this.graphSize--;
  }

  /**
   * Get dependencies of specified module.
   */
  dependenciesOf(key: ModuleQueryKey): Module[] {
    const module = this.INTERNAL__getModule(key);

    return Object.keys(module.dependencies).map((id) =>
      this.getModule(parseInt(id, 10)),
    );
  }

  /**
   * Get dependents of specified module.
   */
  dependentsOf(key: ModuleQueryKey): Module[] {
    const module = this.INTERNAL__getModule(key);

    return Array.from(module.dependents).map((id) => this.getModule(id));
  }

  /**
   * Get inverse dependencies of specified module.
   */
  inverseDependenciesOf(key: ModuleQueryKey): Module[] {
    const module = this.INTERNAL__getModule(key);

    return this.traverseInverseModules(module.id).map((id) =>
      this.getModule(id),
    );
  }
}
