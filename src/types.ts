import type { Metafile } from 'esbuild';

export const EXTERNAL = Symbol('external');

export type EsbuildMeta = Metafile['inputs'][string];

export interface Module {
  /** @internal */
  readonly [EXTERNAL]: true;
  id: ModuleId;
  path: string;
  dependencies: Set<ModuleId>;
  dependents: Set<ModuleId>;
}

export type ModuleId = number;
export type ModulePath = string;

export type RelativePath = string & { __relative: true };
