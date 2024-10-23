import type { Metafile } from 'esbuild';

export const EXTERNAL = Symbol('external');

export type EsbuildMeta = Metafile['inputs'][string];

export interface Module {
  /** @internal */
  readonly [EXTERNAL]: boolean;
  id: number;
  path: string;
  dependencies: Set<number>;
  dependents: Set<number>;
}

export type RelativePath = string & { __relative: true };
