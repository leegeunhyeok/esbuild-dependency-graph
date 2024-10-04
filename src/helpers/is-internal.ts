import type { Module, InternalModule } from '../types';
import { isExternal } from './is-external';

/**
 * Check if the module is external.
 */
export const isInternal = (module: Module): module is InternalModule => {
  return !isExternal(module);
};
