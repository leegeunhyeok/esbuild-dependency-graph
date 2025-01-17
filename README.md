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
   * Workspace root path for lookup modules.
   *
   * Defaults to `process.cwd()`.
   */
  root: '/path/to/project-root',
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

````ts
import { DependencyGraph, isExternal } from 'esbuild-dependency-graph';

// Check if the module exists.
graph.hasModule('path/to/code.ts'); // `boolean`

// Get module data by module path.
graph.getModule('path/to/code.ts'); // `Module`

// Register new module to the graph.
graph.addModule('path/to/code.ts', {
  dependencies: [
    /**
     * - `key`: Module ID or path.
     *   - `string`: Module path
     *   - `number`: Module ID
     * - `source`: Actual module source (import source, require id, etc.)
     *    ```js
     *    import React from 'react'; // => 'react'
     *    import { app } from './app'; // => './app'
     *    require('../commonjs-module'); // => '../commonjs-module'
     *    ```
     */
    { key: 'path/to/dependency-a', source: './dependency-a' },
    { key: 'path/to/dependency-b', source: './dependency-b' },
  ],
}); // `Module`

// Update registered module.
graph.updateModule('path/to/code.ts', {
  dependencies: [
    { key: 'path/to/dependency-a', source: './dependency-a' },
    { key: 'path/to/dependency-b', source: './dependency-b' },
  ],
}); // `Module`

// Remove module from graph.
graph.removeModule('path/to/code.ts'); // `void`

// You can also provide the module's ID.
graph.hasModule(0);
graph.getModule(1);
graph.addModule(2, {
  dependencies: [
    { key: 3, source: './dependency-a' },
    { key: 4, source: './dependency-b' },
  ],
});
graph.updateModule(6, {
  dependencies: [
    { key: 7, source: './dependency-c' },
    { key: 8, source: './dependency-d' },
  ],
});
graph.removeModule(10);
````

</details>

<details>

  <summary>Types</summary>

```ts
interface Module {
  id: number;
  path: string;
  dependencies: Dependency[];
  dependents: number[];
}

interface Dependency {
  id: number;
  source: string;
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
  dependencies: [
    {
      id: 73,
      original: 'react'
    },
    {
      id: 509,
      original: 'react/jsx-runtime'
    },
    {
      id: 1042,
      original: 'dripsy'
    }
  ],
  dependents: [
    1123
  ]
}

// Dependencies
[
  {
    id: 509,
    path: 'node_modules/react/jsx-runtime.js',
    dependents: [
       512,
       514,
       633,
       /* ... */
    ],
    dependencies: [
      508
    ]
  },
  {
    id: 73,
    path: 'node_modules/react/index.js',
    dependencies: [
      {
        id: 72,
        original: './cjs/react.development.js'
      }
    ],
    dependents: [
      512,
      514,
      633,
      /* ... */
    ]
  },
  {
    id: 1043,
    path: 'node_modules/dripsy/src/index.ts',
    dependencies: [
      {
        id: 1041,
        original: './core'
      }
    ],
    dependents: [
      1118,
      1120,
      1357,
      1359,
      1365,
      1366
    ]
  }
]

// Dependents
[
  {
    id: 1121,
    path: 'src/components/index.ts',
    dependencies: [
      {
        id: 1118,
        original: './Button'
      },
      {
        id: 1119,
        original: './Fade'
      },
      {
        id: 1120,
        original: './Section'
      }
    ],
    dependents: [
      1357,
      1359
    ]
  }
]

// Inverse dependencies
[
  {
    id: 1121,
    path: 'src/components/index.ts',
    dependencies: [
      {
        id: 1118,
        original: './Button'
      },
      {
        id: 1119,
        original: './Fade'
      },
      {
        id: 1120,
        original: './Section'
      }
    ],
    dependents: [
      1357,
      1359
    ]
  },
  {
    id: 1357,
    path: 'src/screens/MainScreen.tsx',
    dependencies: [
      {
        id: 73,
        original: 'react'
      },
      /* ... */
    ],
    dependents: [
      1360
    ]
  },
  /* ... */
  // Entry point of bundle
  {
    id: 1368,
    path: 'index.js',
    dependencies: [
      {
        id: 254,
        original: '/Users/ghlee/workspace/react-native-esbuild/example/node_modules/react-native/Libraries/Core/InitializeCore.js'
      },
      {
        id: 448,
        original: 'react-native'
      },
      {
        id: 1366,
        original: './src/App'
      },
      {
        id: 1367,
        original: './app.json'
      }
    ],
    dependents: []
  }
]
```

## License

[MIT](./LICENSE)
