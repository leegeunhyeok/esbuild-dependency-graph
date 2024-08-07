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
import { DependencyGraph, isExternal } from 'esbuild-dependency-graph';

const graph = new DependencyGraph(metafile, 'entry.ts');

// Get module id by actual module path.
graph.getModuleId('path/to/code.ts'); // `ModuleId`

// Get module.
graph.getModule(moduleId); // `Module`

// Get dependencies of the specified module.
graph.dependenciesOf(moduleId); // `ModuleId[]`

// Get inverse dependencies of the specified module.
graph.inverseDependenciesOf(moduleId); // `ModuleId[]`

// Check if the module is external.
isExternal(someModule); // `boolean`
```

```ts
type EsbuildModule = Metafile['inputs'][string];

type InternalModule = EsbuildModule & {
  id: ModuleId;
  path: string;
  dependencies: Set<ModuleId>;
  inverseDependencies: Set<ModuleId>;
};

interface ExternalModule {
  id: ModuleId;
  path: string;
  __external: true;
}

type ModuleId = number;
type Module = InternalModule | ExternalModule;
```

## Where is the module path?

```ts
/**
 * @type {import('esbuild').Metafile}
 */
interface Metafile {
  inputs: {
    [path: string]: { // Can be used as module path!
      imports: {
        path: string // Can be used as module path!
        ...
      }[]
      ...
    }
  },
  outputs: {
    ...
  }
}
```

## Demo

Demo code [here](./demo/index.ts).

```js
{
  id: 1123,
  path: 'src/components/Section.tsx',
  format: 'esm',
  imports: [
    {
      path: 'node_modules/react/jsx-runtime.js',
      original: 'react/jsx-runtime'
    },
    { path: 'node_modules/react/index.js', original: 'react' },
    { path: 'node_modules/dripsy/src/index.ts', original: 'dripsy' }
  ],
  dependencies: [
    { id: 1, path: 'node_modules/react/jsx-runtime.js' },
    { id: 2, path: 'node_modules/react/index.js' },
    { id: 3, path: 'node_modules/dripsy/src/index.ts' }
  ],
  inverseDependencies: [
    { id: 1123, path: 'src/components/Section.tsx' },
    { id: 1124, path: 'src/components/index.ts' },
    { id: 1360, path: 'src/screens/MainScreen.tsx' },
    { id: 1362, path: 'src/screens/IntroScreen.tsx' },
    { id: 1363, path: 'src/screens/index.ts' },
    { id: 1364, path: 'src/navigators/RootStack.tsx' },
    { id: 1365, path: 'src/navigators/index.ts' },
    { id: 1369, path: 'src/App.tsx' },
    { id: 1371, path: 'index.js' }
  ]
}
```

## License

[MIT](./LICENSE)
