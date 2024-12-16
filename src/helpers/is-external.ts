import type { ModuleBase } from '../types';

/**
 * Check if the module is external.
 */
export const isExternal = <Module extends ModuleBase>(
  module: Module,
): boolean => {
  return Boolean(module.meta.external);
};
