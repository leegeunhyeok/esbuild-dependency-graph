# esbuild-dependency-graph

> Dependency graph helper based on esbuild's [metafile](https://esbuild.github.io/api/#metafile)

## Installation

```bash
npm install esbuild-dependency-graph
# or yarn
yarn add esbuild-dependency-graph
```

## Usage

```ts
import * as esbuild from 'esbuild';
import { DependencyGraph } from 'esbuild-dependency-graph';

const result = await esbuild.build({
  metafile: true,
  /* other build options */
});

const graph = new DependencyGraph({
  /**
   * Root path for lookup modules.
   *
   * Defaults to `process.cwd()`.
   */
  root: '/path/to/root-dir',
});

// Generate or update the dependency graph using the esbuild metafile.
graph.load(result.metafile);

// Get dependencies of the specified module.
graph.dependenciesOf('path/to/code.ts'); // `Module[]`

// Get dependents of the specified module.
graph.dependentsOf('path/to/code.ts'); // `Module[]`

// Get inverse dependencies of the specified module.
graph.inverseDependenciesOf('path/to/code.ts'); // `Module[]`

// You can also provide the module's ID.
graph.dependenciesOf(1);
graph.dependentsOf(2);
graph.inverseDependenciesOf(3);

// Reset dependency graph.
graph.reset();
```

<details>

  <summary>Advanced</summary>

```ts
import { DependencyGraph, isExternal } from 'esbuild-dependency-graph';

// Check if the module exists.
graph.hasModule('path/to/code.ts'); // `boolean`

// Get module data by module path.
graph.getModule('path/to/code.ts'); // `Module`

// Register new module to the graph.
graph.addModule(
  'path/to/code.ts',
  ['path/to/dependency-a', 'path/to/dependency-b'],
  ['path/to/dependent'],
); // `Module`

// Update registered module.
graph.updateModule(
  'path/to/code.ts',
  ['path/to/dependency-a', 'path/to/dependency-b'],
  ['path/to/dependent'],
); // `Module`

// Remove module from graph.
graph.removeModule('path/to/code.ts'); // `void`

// You can also provide the module's ID.
graph.hasModule(0);
graph.getModule(1);
graph.addModule(2, [3, 4], [5]);
graph.updateModule(6, [7, 8], [9]);
graph.removeModule(10);

// Check if this module is external.
isExternal(targetModule); // `boolean`
```

</details>

<details>

  <summary>Types</summary>

```ts
type EsbuildModule = Metafile['inputs'][string];

interface Module {
  id: number;
  path: string;
  dependencies: Set<number>;
  dependents: Set<number>;
}
```

</details>

## Where is the module path?

```ts
/**
 * @type {import('esbuild').Metafile}
 */
interface Metafile {
  inputs: {
    [path: string]: {
      // Can be used as module path!
      imports: {
        path: string; // Can be used as module path!
        /* ... */
      }[];
      /* ... */
    };
  };
  outputs: {
    /* ... */
  };
}
```

## Demo

Demo code [here](./demo/index.ts).

```js
// Module: src/components/Section.tsx
{
  id: 1122,
  path: 'src/components/Section.tsx',
  dependencies: Set(3) { 509, 73, 1043 },
  dependents: Set(1) { 1123 }
}

// Dependencies
[
  {
    id: 509,
    path: 'node_modules/react/jsx-runtime.js',
    dependencies: Set(1) { 508 },
    dependents: Set(95) {
      ...
    }
  },
  {
    id: 73,
    path: 'node_modules/react/index.js',
    dependencies: Set(1) { 72 },
    dependents: Set(290) {
      ...
    }
  },
  {
    id: 1043,
    path: 'node_modules/dripsy/src/index.ts',
    dependencies: Set(1) { 1042 },
    dependents: Set(6) { 1120, 1122, 1359, 1361, 1367, 1368 }
  }
]

// Dependents
[
  {
    id: 1123,
    path: 'src/components/index.ts',
    dependencies: Set(3) { 1120, 1121, 1122 },
    dependents: Set(2) { 1359, 1361 }
  }
]

// Inverse dependencies
[
  {
    id: 1123,
    path: 'src/components/index.ts',
    dependencies: Set(3) { 1120, 1121, 1122 },
    dependents: Set(2) { 1359, 1361 }
  },
  {
    id: 1359,
    path: 'src/screens/MainScreen.tsx',
    dependencies: Set(7) { 509, 73, 448, 518, 1043, 1123, 1358 },
    dependents: Set(1) { 1362 }
  },
  {
    id: 1361,
    path: 'src/screens/IntroScreen.tsx',
    dependencies: Set(6) { 509, 73, 448, 1043, 1123, 1360 },
    dependents: Set(1) { 1362 }
  },
  {
    id: 1362,
    path: 'src/screens/index.ts',
    dependencies: Set(2) { 1359, 1361 },
    dependents: Set(1) { 1363 }
  },
  {
    id: 1363,
    path: 'src/navigators/RootStack.tsx',
    dependencies: Set(4) { 509, 73, 1119, 1362 },
    dependents: Set(1) { 1364 }
  },
  {
    id: 1364,
    path: 'src/navigators/index.ts',
    dependencies: Set(1) { 1363 },
    dependents: Set(1) { 1368 }
  },
  {
    id: 1368,
    path: 'src/App.tsx',
    dependencies: Set(9) { 509, 73, 518, 814, 914, 986, 1043, 1364, 1367 },
    dependents: Set(1) { 1370 }
  },
  {
    id: 1370,
    path: 'index.js',
    dependencies: Set(4) { 254, 448, 1368, 1369 },
    dependents: Set(0) {}
  }
]
```

## License

[MIT](./LICENSE)
