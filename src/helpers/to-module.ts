import type { InternalModule, Module } from '../types';

export function toModule(internalModule: InternalModule): Module {
  return {
    ...internalModule,
    dependencies: Object.entries(internalModule.dependencies).map(
      ([id, source]) => ({ id: Number(id), source }),
    ),
    dependents: Array.from(internalModule.dependents),
  };
}
