import type { Metafile } from 'esbuild';
import type { Module, ModuleNode, ModuleId, ModuleIdMap } from './types';

type ModuleDependencyGraph = Record<ModuleId, ModuleNode | undefined>;

export class DependencyGraph {
  private dependencyGraph: ModuleDependencyGraph = {};
  private moduleIdMap: ModuleIdMap = {};
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
   * Get module by actual path in metafile.
   */
  private getModule(modulePath: string): Module | null {
    const targetInput = this.metafile.inputs[modulePath];
    if (targetInput) {
      return Object.defineProperty(this.metafile.inputs[modulePath], 'path', {
        enumerable: true,
        value: modulePath,
      }) as Module;
    }
    return null;
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
      this.moduleIdMap[moduleId] = module;
      this.dependencyGraph[moduleId] = node;
    }

    return [moduleId, this.dependencyGraph[moduleId]!];
  }

  /**
   * Traverse modules for get dependencies.
   */
  private traverseModules(): void {
    for (const modulePath in this.metafile.inputs) {
      const currentModule = this.getModule(modulePath);
      if (!currentModule) {
        throw new Error(`unable to get module: '${modulePath}'`);
      }

      const [currentModuleId, currentNode] =
        this.registerDependency(currentModule);

      for (const importModule of currentModule.imports) {
        const importedModule = this.getModule(importModule.path);
        if (importedModule) {
          const [importedModuleId, importedNode] =
            this.registerDependency(importedModule);

          importedNode.inverseDependencies.add(currentModuleId);
          currentNode.dependencies.add(importedModuleId);
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
    const targetModule = this.dependencyGraph[moduleId];
    if (!targetModule) throw new Error(`'${moduleId}'`);

    // Reached to entry.
    if (targetModule.inverseDependencies.size === 0) {
      return inverseModuleIds;
    }

    for (const inverseModuleId of targetModule.inverseDependencies) {
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
   * Get module by module id.
   */
  getModuleById(moduleId: ModuleId): Module | undefined {
    return this.moduleIdMap[moduleId] ?? null;
  }

  /**
   * Get module map.
   */
  getModuleIdMap(): ModuleIdMap {
    return this.moduleIdMap;
  }

  /**
   * Get dependencies of specified module.
   */
  dependenciesOf(moduleId: ModuleId): ModuleId[] {
    return Array.from(this.dependencyGraph[moduleId]?.dependencies ?? []);
  }

  /**
   * Get inverse dependencies of specified module.
   */
  inverseDependenciesOf(moduleId: ModuleId): ModuleId[] {
    return this.traverseInverseModules(moduleId);
  }
}
