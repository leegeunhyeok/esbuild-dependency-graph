import type { Metafile } from 'esbuild';
import { isExternal } from './helpers';
import type {
  EsbuildModule,
  ExternalModule,
  InternalModule,
  Module,
  ModuleId,
} from './types';

type ModuleDependencyGraph = Record<ModuleId, Module | undefined>;

export class DependencyGraph {
  private dependencyGraph: ModuleDependencyGraph = {};
  private INTERNAL__moduleIds: Record<string, number> = {};
  private INTERNAL__moduleId = 0;

  constructor(
    private metafile: Metafile,
    entryPoint: string,
    initialModuleIdMap?: Record<string, number>,
  ) {
    // Entry point module id is always `0`.
    this.INTERNAL__moduleIds[entryPoint] = this.INTERNAL__moduleId++;
    if (initialModuleIdMap) {
      this.INTERNAL__moduleIds = initialModuleIdMap;
      this.INTERNAL__moduleId =
        Math.max(...Object.values(initialModuleIdMap)) + 1;
    }
    this.generateDependencyGraph();
  }

  /**
   * Generate unique id for module.
   *
   * If already has id for path return cached id
   * else generate new one.
   */
  private generateUniqueModuleId(path: string): number {
    return (
      this.INTERNAL__moduleIds[path] ??
      (() => (this.INTERNAL__moduleIds[path] = this.INTERNAL__moduleId++))()
    );
  }

  /**
   * Create `ExternalModule` data.
   */
  private getExternalModule(moduleId: ModuleId, path: string): ExternalModule {
    return Object.defineProperties(
      {},
      {
        id: { value: moduleId },
        path: { value: path },
        __external: {
          enumerable: false,
          value: true,
        },
      },
    ) as ExternalModule;
  }

  /**
   * Enhance esbuild's input module to `InternalModule`.
   */
  private toInternalModule(
    esbuildModule: EsbuildModule,
    moduleId: ModuleId,
    path: string,
  ): InternalModule {
    return Object.defineProperties(esbuildModule, {
      id: { value: moduleId },
      path: { value: path },
      dependencies: { value: new Set() },
      inverseDependencies: { value: new Set() },
    }) as InternalModule;
  }

  /**
   * Get module by actual path in metafile.
   */
  private addNode(modulePath: string, external = false): Module {
    let id: ModuleId | undefined;

    if (
      (id = this.INTERNAL__moduleIds[modulePath]) &&
      id in this.dependencyGraph
    ) {
      return this.dependencyGraph[id]!;
    }

    if (external) {
      id = this.generateUniqueModuleId(modulePath);
      return (this.dependencyGraph[id] = this.getExternalModule(
        id,
        modulePath,
      ));
    } else if (this.metafile.inputs[modulePath]) {
      id = this.generateUniqueModuleId(modulePath);
      return (this.dependencyGraph[id] = this.toInternalModule(
        this.metafile.inputs[modulePath],
        id,
        modulePath,
      ));
    }

    throw new Error(`unable get module: '${modulePath}'`);
  }

  /**
   * Traverse modules for get dependencies.
   */
  private generateDependencyGraph(): void {
    for (const modulePath in this.metafile.inputs) {
      const currentModule = this.addNode(modulePath);

      if (isExternal(currentModule)) {
        continue;
      }

      for (const importModule of currentModule.imports) {
        const importedModule = this.addNode(
          importModule.path,
          importModule.external,
        );

        currentModule.dependencies.add(importedModule.id);

        if (!isExternal(importedModule)) {
          importedModule.inverseDependencies.add(currentModule.id);
        }
      }
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
      inverseModuleIds.push(currentModuleId);

      if (module && isExternal(module)) continue;

      module?.inverseDependencies.forEach((inverseModuleId) => {
        if (visited[inverseModuleId]) return;
        visited[inverseModuleId] = true;
        queue.push(inverseModuleId);
      });
    }

    return inverseModuleIds;
  }

  /**
   * Get module id by actual module path.
   *
   * ```ts
   * // `Metafile` type in esbuild
   * interface Metafile {
   *   inputs: {
   *     [path: string]: { // Can be used as `modulePath`
   *       imports: {
   *         path: string // Can be used as `modulePath`
   *         ...
   *       }[]
   *       ...
   *     }
   *   },
   *   outputs: {
   *    ...
   *   }
   * }
   * ```
   */
  getModuleId(modulePath: string): number {
    const id = this.INTERNAL__moduleIds[modulePath];
    if (typeof id === 'number') return id;
    throw new Error(`unable get id: '${modulePath}'`);
  }

  /**
   * Get module by id.
   */
  getModule(moduleId: ModuleId): Module {
    const module = this.dependencyGraph[moduleId];
    if (module) return module;
    throw new Error(`unable get module: '${moduleId}'`);
  }

  /**
   * Get dependencies of specified module.
   */
  dependenciesOf(moduleId: ModuleId): ModuleId[] {
    const module = this.getModule(moduleId);
    return isExternal(module) ? [] : Array.from(module.dependencies);
  }

  /**
   * Get inverse dependencies of specified module.
   */
  inverseDependenciesOf(moduleId: ModuleId): ModuleId[] {
    return this.traverseInverseModules(moduleId);
  }
}
