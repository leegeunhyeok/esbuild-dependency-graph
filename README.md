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
import {
  DependencyGraph,
  isInternal,
  isExternal,
} from 'esbuild-dependency-graph';

const result = await esbuild.build({
  metafile: true,
  /* other build options */
});

const graph = new DependencyGraph(result.metafile);

// Get module.
graph.getModule('path/to/code.ts'); // `Module`

// Add new module to the graph.
graph.addModule(
  'path/to/code.ts',
  ['path/to/dependency-a', 'path/to/dependency-b'],
  ['path/to/dependent'],
); // `void`

// Get dependencies of the specified module.
graph.dependenciesOf('path/to/code.ts'); // `ModulePath[]`

// Get dependents of the specified module.
graph.dependentsOf('path/to/code.ts'); // `ModulePath[]`

// Get inverse dependencies of the specified module.
graph.inverseDependenciesOf('path/to/code.ts'); // `ModulePath[]`

// Check if this module is internal or external.
isInternal('path/to/code.ts'); // `boolean`
isExternal('path/to/code.ts'); // `boolean`
```

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
  esbuild: {
    bytes: 597,
    imports: [ [Object], [Object], [Object] ],
    format: 'esm'
  },
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
