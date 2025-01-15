import type { RelativePath, InternalModule } from '../types';

const modulePrototype = Object.create({});

modulePrototype.toString = function () {
  return `${this.path}#${this.id}`;
};

export function createModule(id: number, path: RelativePath): InternalModule {
  const module = Object.create(modulePrototype);

  return Object.defineProperties(module, {
    id: { value: id, enumerable: true },
    path: { value: path, enumerable: true },
    dependencies: { value: {}, enumerable: true, writable: true },
    dependents: { value: new Set(), enumerable: true },
  }) as InternalModule;
}
