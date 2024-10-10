import {
  EXTERNAL,
  ID,
  type Module,
  type ModulePath,
  type ModuleId,
} from '../types';

export function createModule(
  id: ModuleId,
  path: ModulePath,
  external = false,
): Module {
  return Object.defineProperties(
    {},
    {
      [ID]: { value: id },
      [EXTERNAL]: { value: external },
      path: { value: path, enumerable: true },
      dependencies: { value: new Set(), enumerable: true },
      dependents: { value: new Set(), enumerable: true },
    },
  ) as Module;
}
