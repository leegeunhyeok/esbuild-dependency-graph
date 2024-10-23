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
graph.dependenciesOf('path/to/code.ts'); // `string[]`

// Get dependents of the specified module.
graph.dependentsOf('path/to/code.ts'); // `string[]`

// Get inverse dependencies of the specified module.
graph.inverseDependenciesOf('path/to/code.ts'); // `string[]`

// Reset dependency graph.
graph.reset();
```

<details>

  <summary>Advanced</summary>

```ts
import {
  DependencyGraph,
  isExternal,
  isInternal,
} from 'esbuild-dependency-graph';

// Get module.
graph.getModule('path/to/code.ts'); // `Module`

// Register new module to the graph.
graph.addModule(
  'path/to/code.ts',
  ['path/to/dependency-a', 'path/to/dependency-b'],
  ['path/to/dependent'],
); // `void`

// Update registered module.
graph.updateModule(
  'path/to/code.ts',
  ['path/to/dependency-a', 'path/to/dependency-b'],
  ['path/to/dependent'],
); // `void`

// Remove module from graph.
graph.removeModule('path/to/code.ts'); // `void`

// Check if this module is external.
isExternal('path/to/code.ts'); // `boolean`
```

</details>

<details>

  <summary>Types</summary>

```ts
type EsbuildModule = Metafile['inputs'][string];

interface InternalModule extends ModuleBase, EsbuildModule {
  dependencies: Set<ModuleId>;
  inverseDependencies: Set<ModuleId>;
}

interface ExternalModule extends ModuleBase {}

type ModuleId = number;
type ModulePath = string;
type Module = InternalModule | ExternalModule;
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
  path: 'src/components/Section.tsx',
  dependencies: Set(3) { 509, 73, 1043 },
  inverseDependencies: Set(1) { 1123 }
}

// Dependencies
[
  'node_modules/react/jsx-runtime.js',
  'node_modules/react/index.js',
  'node_modules/dripsy/src/index.ts'
]

// Dependents
[ 'src/components/index.ts' ]

// Inverse dependencies
[
  'src/components/index.ts',
  'src/screens/MainScreen.tsx',
  'src/screens/IntroScreen.tsx',
  'src/screens/index.ts',
  'src/navigators/RootStack.tsx',
  'src/navigators/index.ts',
  'src/App.tsx',
  'index.js'
]
```

## License

[MIT](./LICENSE)
