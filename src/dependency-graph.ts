import type { Metafile } from 'esbuild';
import {
  createExternalModule,
  createInternalModule,
  isExternal,
  isInternal,
} from './helpers';
import {
  ID,
  type ExternalModule,
  type InternalModule,
  type Module,
  type ModuleId,
  type ModulePath,
} from './types';
import { assertValue } from './utils';

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
   * Generate a dependency graph based on the meta file.
   */
  private generateDependencyGraph(): void {
    for (const modulePath in this.metafile.inputs) {
      const currentModule = this.createModule(modulePath);

      if (isExternal(currentModule)) {
        continue;
      }

      for (const importMeta of currentModule.esbuild?.imports ?? []) {
        const dependencyModule = this.createModule(
          importMeta.path,
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
   * Get module id
   */
  private getModuleId(modulePath: ModulePath): ModuleId | null {
    let id: ModuleId | undefined;

    return typeof (id = this.INTERNAL__moduleIds[modulePath]) === 'number' &&
      id in this.dependencyGraph
      ? id
      : null;
  }

  /**
   * Get module by actual path in metafile.
   */
  private createModule(modulePath: ModulePath, external = false): Module {
    const id = this.getModuleId(modulePath);

    if (typeof id === 'number') {
      return this.dependencyGraph[id]!;
    }

    const newModuleId = this.generateUniqueModuleId(modulePath);
    const newModule = external
      ? createExternalModule(newModuleId, modulePath)
      : createInternalModule(
          newModuleId,
          modulePath,
          this.metafile.inputs[modulePath],
        );

    return (this.dependencyGraph[newModule[ID]] = newModule);
  }

  /**
   * Link the dependency relationship between the two modules.
   */
  private linkModules(
    sourceModule: ExternalModule | InternalModule,
    targetModule: ExternalModule | InternalModule,
  ): void {
    if (isInternal(sourceModule)) {
      sourceModule.dependencies.add(targetModule[ID]);
    }

    if (isInternal(targetModule)) {
      targetModule.dependents.add(sourceModule[ID]);
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
   * Get module by id.
   */
  private getModuleById(moduleId: ModuleId): Module {
    return assertValue(
      this.dependencyGraph[moduleId],
      `module not found (id: ${moduleId})`,
    );
  }

  /**
   * Get module information by module path
   */
  getModule(modulePath: ModulePath): Module {
    const moduleId = assertValue(
      this.getModuleId(modulePath),
      `module not found: '${modulePath}'`,
    );

    return this.getModuleById(moduleId);
  }

  /**
   * Register new module to dependency graph.
   */
  addModule(
    path: ModulePath,
    dependencies: ModulePath[] = [],
    dependents: ModulePath[] = [],
  ): void {
    // Validate that the IDs of modules are registered.
    const dependencyModules = dependencies.map((dependencyPath) =>
      this.getModule(dependencyPath),
    );
    const dependentModules = dependents.map((dependentPath) =>
      this.getModule(dependentPath),
    );
    const newModule = this.createModule(path) as InternalModule;

    dependencyModules.forEach((module) => {
      newModule.dependencies.add(module[ID]);
      this.linkModules(newModule, module);
    });

    dependentModules.forEach((module) => {
      newModule.dependents.add(module[ID]);
      this.linkModules(module, newModule);
    });
  }

  /**
   * Get dependencies of specified module.
   */
  dependenciesOf(modulePath: ModulePath): ModulePath[] {
    const moduleId = assertValue(
      this.getModuleId(modulePath),
      `module not found: '${modulePath}'`,
    );
    const module = this.getModuleById(moduleId);

    return isExternal(module)
      ? []
      : Array.from(module.dependencies).map(
          (id) => this.getModuleById(id).path,
        );
  }

  /**
   * Get dependents of specified module.
   */
  dependentsOf(modulePath: ModulePath): ModulePath[] {
    const moduleId = assertValue(
      this.getModuleId(modulePath),
      `module not found: '${modulePath}'`,
    );
    const module = this.getModuleById(moduleId);

    return isExternal(module)
      ? []
      : Array.from(module.dependents).map((id) => this.getModuleById(id).path);
  }

  /**
   * Get inverse dependencies of specified module.
   */
  inverseDependenciesOf(modulePath: ModulePath): ModulePath[] {
    const moduleId = assertValue(
      this.getModuleId(modulePath),
      `module not found: '${modulePath}'`,
    );

    return this.traverseInverseModules(moduleId).map(
      (id) => this.getModuleById(id).path,
    );
  }
}
