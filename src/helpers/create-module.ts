import {
  EXTERNAL,
  type RelativePath,
  type Module,
  type ModuleId,
} from '../types';

export function createModule(
  id: ModuleId,
  path: RelativePath,
  external = false,
): Module {
  return Object.defineProperties(
    {},
    {
      [EXTERNAL]: { value: external },
      id: { value: id, enumerable: true },
      path: { value: path, enumerable: true },
      dependencies: { value: new Set(), enumerable: true },
      dependents: { value: new Set(), enumerable: true },
    },
  ) as Module;
}
