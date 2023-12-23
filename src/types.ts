import type { Metafile } from 'esbuild';

export type ModuleId = number;
export type ModuleMap = Record<ModuleId, Module>;
export type Module = Metafile['inputs'][string] & {
  path: string;
};

export type ModuleDependencyGraph = Record<ModuleId, ModuleNode>;

export interface ModuleNode {
  dependencies: Set<ModuleId>;
  inverseDependencies: Set<ModuleId>;
}
