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
  /* build options */
});

const graph = new DependencyGraph(result.metafile);

// Get module.
graph.getModule('path/to/code.ts'); // `Module`

// Get dependencies of the specified module.
graph.dependenciesOf('path/to/code.ts'); // `ModulePath[]`

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
  bytes: 597,
  imports: [
    {
      path: 'node_modules/react/jsx-runtime.js',
      kind: 'import-statement',
      original: 'react/jsx-runtime'
    },
    {
      path: 'node_modules/react/index.js',
      kind: 'import-statement',
      original: 'react'
    },
    {
      path: 'node_modules/dripsy/src/index.ts',
      kind: 'import-statement',
      original: 'dripsy'
    }
  ],
  format: 'esm'
}

// Dependencies
[
  'node_modules/react/jsx-runtime.js',
  'node_modules/react/index.js',
  'node_modules/dripsy/src/index.ts'
]

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
