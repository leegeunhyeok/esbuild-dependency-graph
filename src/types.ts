import * as esbuild from 'esbuild';
export const EXTERNAL = Symbol();

export type ESBuildMeta = esbuild.Metafile['inputs'][string];
export type ModuleMeta = {
  source: string;
};

export interface ModuleBase {
  /**
   * Module ID
   */
  id: number;
  /**
   * Module path
   */
  path: string;
}

export interface InternalModule extends ModuleBase {
  dependencies: Record<number, string>;
  dependents: Set<number>;
}

export interface Module extends ModuleBase {
  /**
   * Dependencies of the module.
   */
  dependencies: Dependency[];
  /**
   * Dependents of the module.
   */
  dependents: number[];
}

export type RelativePath = string & { __relative: true };

export interface Dependency {
  /**
   * Module ID
   */
  id: number;
  /**
   * Actual module source (import source, require id, etc.)
   *
   * ```js
   * import React from 'react'; // => 'react'
   * import { app } from './app'; // => './app'
   * require('../commonjs-module'); // => '../commonjs-module'
   * ```
   */
  source: string;
}

/**
 * - `string`: Module path
 * - `number`: Module ID
 */
export type ModuleQueryKey = string | number;
