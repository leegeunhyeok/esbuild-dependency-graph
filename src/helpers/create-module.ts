import type { RelativePath, InternalModule, ModuleMeta } from '../types';

export function createModule(
  id: number,
  path: RelativePath,
  meta: ModuleMeta,
): InternalModule {
  return Object.defineProperties(
    {},
    {
      id: { value: id, enumerable: true },
      path: { value: path, enumerable: true },
      dependencies: { value: new Set(), enumerable: true },
      dependents: { value: new Set(), enumerable: true },
      meta: { value: meta, enumerable: true, writable: true },
    },
  ) as InternalModule;
}
