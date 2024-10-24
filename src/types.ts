import type { Metafile } from 'esbuild';

export const EXTERNAL = Symbol('external');

export type EsbuildMeta = Metafile['inputs'][string];

export interface ModuleBase {
  /** @internal */
  readonly [EXTERNAL]: boolean;
  id: number;
  path: string;
}

export interface InternalModule extends ModuleBase {
  dependencies: Set<number>;
  dependents: Set<number>;
}

export interface Module extends ModuleBase {
  dependencies: number[];
  dependents: number[];
}

export type RelativePath = string & { __relative: true };
