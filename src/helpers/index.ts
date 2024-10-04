import { EXTERNAL, type ExternalModule, type Module } from '../types';

/**
 * Check if the module is external.
 */
export const isExternal = (module: Module): module is ExternalModule => {
  return Boolean(module[EXTERNAL]);
};
