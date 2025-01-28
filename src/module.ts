import type { Dependency } from './types';

export class Module {
  constructor(
    public readonly id: number,
    public readonly path: string,
    public readonly dependencies: Dependency[],
    public readonly dependents: number[],
  ) {}

  get [Symbol.toStringTag]() {
    return 'Module';
  }

  toString() {
    return `Module(${JSON.stringify({ id: this.id, path: this.path })})`;
  }
}
