import {
  EXTERNAL,
  ID,
  type EsbuildMeta,
  type ExternalModule,
  type InternalModule,
  type ModulePath,
  type ModuleId,
} from '../types';

export function createExternalModule(
  id: ModuleId,
  path: string,
): ExternalModule {
  return Object.defineProperties(
    {},
    {
      [ID]: { value: id },
      [EXTERNAL]: { value: true },
      path: { value: path, enumerable: true },
    },
  ) as ExternalModule;
}

export function createInternalModule(
  id: ModuleId,
  path: ModulePath,
  esbuildMeta: EsbuildMeta | null = null,
): InternalModule {
  return Object.defineProperties(
    {},
    {
      [ID]: { value: id },
      path: { value: path, enumerable: true },
      esbuild: { value: esbuildMeta, enumerable: true },
      dependencies: { value: new Set(), enumerable: true },
      inverseDependencies: { value: new Set(), enumerable: true },
    },
  ) as InternalModule;
}
