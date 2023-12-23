import type { Metafile } from 'esbuild';
import type {
  Module,
  ModuleNode,
  ModuleDependencyGraph,
  ModuleId,
  ModuleMap,
} from './types';

export class EsbuildDependencyManager {
  private dependencyGraph: ModuleDependencyGraph = {};
  private moduleMap: ModuleMap = {};
  private INTERNAL__moduleIds: Record<string, number> = {};
  private INTERNAL__moduleId = 1; // entry point: 0, others: 1~

  constructor(
    private metafile: Metafile,
    entryPoint: string,
  ) {
    // Entry point module id is always `0`.
    this.INTERNAL__moduleIds[entryPoint] = 0;
    this.traverseModules();
  }

  /**
   * Generate unique id for module.
   *
   * If already has id for path return cached id
   * else generate new one.
   */
  private generateUniqueModuleId({ path }: Module): number {
    return (
      this.INTERNAL__moduleIds[path] ??
      (() => (this.INTERNAL__moduleIds[path] = this.INTERNAL__moduleId++))()
    );
  }

  /**
   * Add target module to dependency graph if not exist.
   */
  private registerDependency(module: Module): [ModuleId, ModuleNode] {
    const moduleId = this.generateUniqueModuleId(module);

    if (!(moduleId in this.dependencyGraph)) {
      const node: ModuleNode = {
        dependencies: new Set(),
        inverseDependencies: new Set(),
      };
      this.moduleMap[moduleId] = module;
      this.dependencyGraph[moduleId] = node;
    }

    return [moduleId, this.dependencyGraph[moduleId]];
  }

  /**
   * Traverse modules for get dependencies.
   */
  private traverseModules(): void {
    for (const modulePath in this.metafile.inputs) {
      const currentModule = this.getModule(modulePath);
      if (!currentModule) throw new Error(`'${modulePath}' cannot be empty`);

      const [currentModuleId, currentModuleVertex] =
        this.registerDependency(currentModule);

      for (const importModule of currentModule.imports) {
        const importedModule = this.getModule(importModule.path);
        if (importedModule) {
          const [importedModuleId, importedModuleVertex] =
            this.registerDependency(importedModule);

          importedModuleVertex.inverseDependencies.add(currentModuleId);
          currentModuleVertex.dependencies.add(importedModuleId);
        }
      }
    }
  }

  /**
   * Traverse modules for get invert dependencies.
   */
  private traverseInverseModules(
    moduleId: ModuleId,
    inverseModuleIds = [moduleId],
  ): ModuleId[] {
    const { inverseDependencies } = this.dependencyGraph[moduleId];

    // Reached to entry.
    if (inverseDependencies.size === 0) {
      return inverseModuleIds;
    }

    for (const inverseModuleId of inverseDependencies) {
      // To avoid circular references.
      if (inverseModuleIds.includes(inverseModuleId)) {
        continue;
      }

      inverseModuleIds = this.traverseInverseModules(inverseModuleId, [
        ...inverseModuleIds,
        inverseModuleId,
      ]);
    }

    return inverseModuleIds;
  }

  /**
   * Get module id by actual path.
   */
  getModuleId(modulePath: string): number | null {
    return this.INTERNAL__moduleIds[modulePath] ?? null;
  }

  /**
   * Get module by actual path in metafile.
   */
  getModule(modulePath: string): Module | null {
    const targetInput = this.metafile.inputs[modulePath];
    if (targetInput) {
      return Object.defineProperty(this.metafile.inputs[modulePath], 'path', {
        enumerable: true,
        value: modulePath,
      }) as Module;
    }
    console.warn(`unable to get '${modulePath}'`);
    return null;
  }

  /**
   * Get module by module id.
   */
  getModuleById(moduleId: ModuleId): Module | undefined {
    return this.moduleMap[moduleId];
  }

  /**
   * Get module map.
   */
  getModuleMap(): ModuleMap {
    return this.moduleMap;
  }

  /**
   * Get dependency graph.
   */
  getDependencyGraph(): ModuleDependencyGraph {
    return this.dependencyGraph;
  }

  /**
   * Get inverse dependencies based on specified module id.
   */
  getInverseDependencies(moduleId: ModuleId): ModuleId[] {
    return this.traverseInverseModules(moduleId);
  }
}
