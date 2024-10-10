import { EXTERNAL, type Module } from '../types';

/**
 * Check if the module is external.
 */
export const isExternal = (module: Module): boolean => {
  return Boolean(module[EXTERNAL]);
};
