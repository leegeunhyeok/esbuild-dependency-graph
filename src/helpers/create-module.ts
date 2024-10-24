import { EXTERNAL, type RelativePath, type InternalModule } from '../types';

export function createModule(
  id: number,
  path: RelativePath,
  external = false,
): InternalModule {
  return Object.defineProperties(
    {},
    {
      [EXTERNAL]: { value: external },
      id: { value: id, enumerable: true },
      path: { value: path, enumerable: true },
      dependencies: { value: new Set(), enumerable: true },
      dependents: { value: new Set(), enumerable: true },
    },
  ) as InternalModule;
}
