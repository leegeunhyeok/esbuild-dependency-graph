import type { Metafile } from 'esbuild';

export const ID = Symbol('id');
export const EXTERNAL = Symbol('external');

export type EsbuildMeta = Metafile['inputs'][string];

export interface Module {
  /** @internal */
  readonly [ID]: ModuleId;
  /** @internal */
  readonly [EXTERNAL]: true;
  path: string;
  dependencies: Set<ModuleId>;
  dependents: Set<ModuleId>;
}

export type ModuleId = number;
export type ModulePath = string;
