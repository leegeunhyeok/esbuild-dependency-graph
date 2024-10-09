import type { Metafile } from 'esbuild';

export const ID = Symbol('id');
export const EXTERNAL = Symbol('external');

export type EsbuildMeta = Metafile['inputs'][string];

interface ModuleBase {
  /** @internal */
  readonly [ID]: ModuleId;
  path: string;
  dependencies: Set<ModuleId>;
  dependents: Set<ModuleId>;
}

export interface InternalModule extends ModuleBase {
  esbuild: EsbuildMeta | null;
}

export interface ExternalModule extends ModuleBase {
  /** @internal */
  readonly [EXTERNAL]: true;
}

export type ModuleId = number;
export type ModulePath = string;
export type Module = InternalModule | ExternalModule;
