import type { Metafile } from 'esbuild';

export type EsbuildModule = Metafile['inputs'][string];

export type InternalModule = EsbuildModule & {
  id: ModuleId;
  path: string;
  dependencies: Set<ModuleId>;
  inverseDependencies: Set<ModuleId>;
};

export interface ExternalModule {
  id: ModuleId;
  path: string;
  __external: true;
}

export type ModuleId = number;
export type Module = InternalModule | ExternalModule;
