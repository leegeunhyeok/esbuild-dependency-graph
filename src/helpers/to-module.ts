import type { InternalModule, Module } from '../types';

export function toModule(internalModule: InternalModule): Module {
  return {
    ...internalModule,
    dependencies: Array.from(internalModule.dependencies),
    dependents: Array.from(internalModule.dependents),
  };
}
