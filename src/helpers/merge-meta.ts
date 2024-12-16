import type { ModuleMeta } from '../types';

export function mergeMeta(target: ModuleMeta, source: ModuleMeta): ModuleMeta {
  return {
    imports: {
      ...target.imports,
      ...source.imports,
    },
  };
}
