import type { InternalModule } from '../types';
import { Module } from '../module';

export function toModule(internalModule: InternalModule): Module {
  return new Module(
    internalModule.id,
    internalModule.path,
    Object.entries(internalModule.dependencies).map(([id, source]) => ({
      id: Number(id),
      source,
    })),
    Array.from(internalModule.dependents),
  );
}
