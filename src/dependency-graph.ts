import type { Metafile } from 'esbuild';
import { isExternal, isInternal } from './helpers';
import { ID, type Module, type ModuleId, type ModulePath } from './types';
import {
  createExternalModule,
  createInternalModule,
} from './helpers/create-module';

type ModuleDependencyGraph = Record<ModuleId, Module | undefined>;

export class DependencyGraph {
  private dependencyGraph: ModuleDependencyGraph = {};
  private INTERNAL__moduleIds: Record<ModulePath, number> = {};
  private INTERNAL__moduleId = 0;
  private metafile: Metafile;

  constructor(metafile: string | Metafile) {
    this.metafile =
      typeof metafile === 'string'
        ? (JSON.parse(metafile) as Metafile)
        : metafile;

    this.generateDependencyGraph();
  }

  /**
   * Generate unique id for module.
   *
   * If already has id for path return cached id
   * else generate new one.
   */
  private generateUniqueModuleId(modulePath: ModulePath): number {
    return (
      this.INTERNAL__moduleIds[modulePath] ??
      (() => {
        return (this.INTERNAL__moduleIds[modulePath] = this
          .INTERNAL__moduleId++);
      })()
    );
  }

  /**
   * Get module by actual path in metafile.
   */
  private createNode(modulePath: ModulePath, external = false): Module {
    let id: ModuleId | undefined;

    if (
      typeof (id = this.INTERNAL__moduleIds[modulePath]) === 'number' &&
      id in this.dependencyGraph
    ) {
      return this.dependencyGraph[id]!;
    }

    const internalModule = this.metafile.inputs[modulePath];

    if (internalModule || external) {
      const newModuleId = this.generateUniqueModuleId(modulePath);
      return (this.dependencyGraph[newModuleId] = external
        ? createExternalModule(newModuleId, modulePath)
        : createInternalModule(newModuleId, modulePath, internalModule));
    }

    throw new Error(`unable get module: '${modulePath}'`);
  }

  /**
   * Traverse modules for get dependencies.
   */
  private generateDependencyGraph(): void {
    for (const modulePath in this.metafile.inputs) {
      const currentModule = this.createNode(modulePath);

      if (isExternal(currentModule)) {
        continue;
      }

      for (const importModule of currentModule.esbuild?.imports ?? []) {
        const importedModule = this.createNode(
          importModule.path,
          importModule.external,
        );

        currentModule.dependencies.add(importedModule[ID]);

        if (isInternal(importedModule)) {
          importedModule.inverseDependencies.add(currentModule[ID]);
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

      if (currentModuleId !== moduleId) {
        inverseModuleIds.push(currentModuleId);
      }

      if (module && isExternal(module)) {
        continue;
      }

      module?.inverseDependencies.forEach((inverseModuleId) => {
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
  private getModuleId(modulePath: ModulePath): number {
    const id = this.INTERNAL__moduleIds[modulePath];

    if (typeof id === 'number') {
      return id;
    }

    throw new Error(`module not found: '${modulePath}'`);
  }

  /**
   * Get module by id.
   */
  private getModuleById(moduleId: ModuleId): Module {
    const module = this.dependencyGraph[moduleId];

    if (module) {
      return module;
    }

    throw new Error(`unable get module by internal id: '${moduleId}'`);
  }

  private toModulePath(moduleId: ModuleId): ModulePath {
    return this.getModuleById(moduleId).path;
  }

  /**
   * Get module information by module path
   */
  getModule(modulePath: ModulePath): Module {
    const moduleId = this.getModuleId(modulePath);

    return this.getModuleById(moduleId);
  }

  /**
   * Get dependencies of specified module.
   */
  dependenciesOf(modulePath: ModulePath): ModulePath[] {
    const moduleId = this.getModuleId(modulePath);
    const module = this.getModuleById(moduleId);

    return isExternal(module)
      ? []
      : Array.from(module.dependencies).map(this.toModulePath.bind(this));
  }

  /**
   * Get inverse dependencies of specified module.
   */
  inverseDependenciesOf(modulePath: ModulePath): ModulePath[] {
    const moduleId = this.getModuleId(modulePath);

    return this.traverseInverseModules(moduleId).map(
      this.toModulePath.bind(this),
    );
  }
}
