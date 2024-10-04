import type { Metafile } from 'esbuild';

export const ID = Symbol('id');
export const EXTERNAL = Symbol('external');

export type EsbuildModule = Metafile['inputs'][string];

interface ModuleBase {
  readonly [ID]: ModuleId;
  path: string;
}

export interface InternalModule extends ModuleBase, EsbuildModule {
  dependencies: Set<ModuleId>;
  inverseDependencies: Set<ModuleId>;
}

export interface ExternalModule extends ModuleBase {
  readonly [EXTERNAL]: true;
}

export type ModuleId = number;
export type ModulePath = string;
export type Module = InternalModule | ExternalModule;
