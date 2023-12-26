import type { ExternalModule, Module } from '../types';

/**
 * Check if the module is external.
 */
export const isExternal = (module: Module): module is ExternalModule => {
  return '__external' in module && module.__external;
};
