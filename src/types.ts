export interface ModuleBase {
  id: number;
  path: string;
  meta: ModuleMeta;
}

export interface ModuleMeta {
  imports: Record<
    string,
    {
      id: number;
      path: string;
    }
  >;
}

export interface InternalModule extends ModuleBase {
  dependencies: Set<number>;
  dependents: Set<number>;
}

export interface Module extends ModuleBase {
  dependencies: number[];
  dependents: number[];
}

export type RelativePath = string & { __relative: true };
