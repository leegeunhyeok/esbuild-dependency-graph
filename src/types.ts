import type { Metafile } from 'esbuild';

export type ModuleId = number;
export type ModuleIdMap = Record<ModuleId, Module>;
export type Module = Metafile['inputs'][string] & {
  path: string;
};

export interface ModuleNode {
  dependencies: Set<ModuleId>;
  inverseDependencies: Set<ModuleId>;
}
