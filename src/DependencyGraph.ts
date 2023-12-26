import type { Metafile } from 'esbuild';
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
  private INTERNAL__moduleId = 1; // entry point: 0, others: 1~

  constructor(
    private metafile: Metafile,
    entryPoint: string,
  ) {
    // Entry point module id is always `0`.
    this.INTERNAL__moduleIds[entryPoint] = 0;
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
  private addNode(modulePath: string, isExternal = false): Module {
    let id: ModuleId | undefined;

    if (
      (id = this.INTERNAL__moduleIds[modulePath]) &&
      id in this.dependencyGraph
    ) {
      return this.dependencyGraph[id]!;
    }

    if (isExternal) {
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

      if (this.isExternal(currentModule)) {
        continue;
      }

      for (const importModule of currentModule.imports) {
        const importedModule = this.addNode(
          importModule.path,
          importModule.external,
        );

        currentModule.dependencies.add(importedModule.id);

        if (!this.isExternal(importedModule)) {
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

      if (module && this.isExternal(module)) continue;

      module?.inverseDependencies.forEach((inverseModuleId) => {
        if (visited[inverseModuleId]) return;
        visited[inverseModuleId] = true;
        queue.push(inverseModuleId);
      });
    }

    return inverseModuleIds;
  }

  /**
   * Get module id by actual path.
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

    if (this.isExternal(module)) return [];

    return Array.from(module.dependencies);
  }

  /**
   * Get inverse dependencies of specified module.
   */
  inverseDependenciesOf(moduleId: ModuleId): ModuleId[] {
    return this.traverseInverseModules(moduleId);
  }

  /**
   * Check if the module is external.
   */
  isExternal(module: Module): module is ExternalModule {
    return '__external' in module && module.__external;
  }
}
