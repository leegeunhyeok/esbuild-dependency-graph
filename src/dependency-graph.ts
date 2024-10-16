import type { Metafile } from 'esbuild';
import { createModule, isExternal } from './helpers';
import { assertValue } from './utils';
import { ID, type Module, type ModuleId, type ModulePath } from './types';
import path from 'path';

type ModuleDependencyGraph = Record<ModuleId, Module | undefined>;

interface DependencyGraphOptions {
  root?: string;
}

export class DependencyGraph {
  private dependencyGraph: ModuleDependencyGraph = {};
  private INTERNAL__moduleIds: Record<ModulePath, number | undefined> = {};
  private INTERNAL__moduleId = 0;

  constructor(
    metafile: string | Metafile,
    private options: DependencyGraphOptions = {},
  ) {
    this.generateDependencyGraph(
      typeof metafile === 'string'
        ? (JSON.parse(metafile) as Metafile)
        : metafile,
    );
  }

  /**
   * Generate a dependency graph based on the meta file.
   */
  private generateDependencyGraph(metafile: Metafile): void {
    for (const modulePath in metafile.inputs) {
      const currentModule = this.createModule(modulePath);
      const imports = metafile.inputs[modulePath]?.imports ?? [];

      if (isExternal(currentModule)) {
        continue;
      }

      for (const importMeta of imports) {
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
    const lookupPath = this.options.root
      ? path.relative(this.options.root, modulePath)
      : modulePath;

    return typeof (id = this.INTERNAL__moduleIds[lookupPath]) === 'number' &&
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
    const newModule = createModule(newModuleId, modulePath, external);

    return (this.dependencyGraph[newModule[ID]] = newModule);
  }

  /**
   * Link the dependency relationship between the two modules.
   */
  private linkModules(sourceModule: Module, targetModule: Module): void {
    sourceModule.dependencies.add(targetModule[ID]);
    targetModule.dependents.add(sourceModule[ID]);
  }

  /**
   * Remove the module and unlink the dependency relationship.
   */
  unlinkModule(sourceModule: Module, unlinkOnly = false): void {
    const moduleId = sourceModule[ID];

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
    modulePath: ModulePath,
    dependencies: ModulePath[] = [],
    dependents: ModulePath[] = [],
  ): void {
    if (typeof this.getModuleId(modulePath) === 'number') {
      throw new Error(`already registered: '${modulePath}'`);
    }

    // Validate that the IDs of modules are registered.
    const dependencyModules = dependencies.map((dependencyPath) =>
      this.getModule(dependencyPath),
    );
    const dependentModules = dependents.map((dependentPath) =>
      this.getModule(dependentPath),
    );

    const newModule = this.createModule(modulePath);

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
   * Update registered module.
   */
  updateModule(
    modulePath: ModulePath,
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
      targetModule.dependencies.add(module[ID]);
      this.linkModules(targetModule, module);
    });

    dependentModules.forEach((module) => {
      targetModule.dependents.add(module[ID]);
      this.linkModules(module, targetModule);
    });
  }

  /**
   * Remove module from graph.
   */
  removeModule(modulePath: ModulePath): void {
    const moduleId = assertValue(
      this.getModuleId(modulePath),
      `module not found: '${modulePath}'`,
    );
    const module = this.getModuleById(moduleId);

    this.unlinkModule(module);
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

    return Array.from(module.dependencies).map(
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

    return Array.from(module.dependents).map(
      (id) => this.getModuleById(id).path,
    );
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
