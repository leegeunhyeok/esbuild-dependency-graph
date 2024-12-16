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
  /**
   * When enabled, an error is thrown
   * if the module information and metadata do not match exactly.
   *
   * Defaults to `false`.
   */
  strict: true;
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
  {
    dependencies: ['path/to/dependency-a', 'path/to/dependency-b'],
    dependents: ['path/to/dependent'],
    meta: {
      imports: {},
    },
  },
); // `Module`

// Update registered module.
graph.updateModule(
  'path/to/code.ts',
  {
    dependencies: ['path/to/dependency-a', 'path/to/dependency-b'],
    dependents: ['path/to/dependent'],
    meta: {
      imports: {},
    },
  },
); // `Module`

// Remove module from graph.
graph.removeModule('path/to/code.ts'); // `void`

// You can also provide the module's ID.
graph.hasModule(0);
graph.getModule(1);
graph.addModule(2, {
  dependencies: [3, 4],
  dependents: [5],
  meta: { imports: {} },
});
graph.updateModule(6, {
  dependencies: [7, 8],
  dependents: [9],
  meta: { imports: {} },
});
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
  dependencies: number[];
  dependents: number[];
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
  dependencies: [ 509, 73, 1043 ],
  dependents: [ 1123 ],
  meta: {
    external: false,
    imports: {
      'react/jsx-runtime': {
        id: 509,
        path: 'node_modules/react/jsx-runtime.js'
      },
      react: {
        id: 73,
        path: 'node_modules/react/index.js'
      },
      dripsy: {
        id: 1043,
        path: 'node_modules/dripsy/src/index.ts'
      }
    }
  }
}

// Dependencies
[
  {
    id: 509,
    path: 'node_modules/react/jsx-runtime.js',
    dependencies: [ 508 ],
    dependents: [
       512,  514,  633,  655,  657,  679,  680,  774,  784,  790,
       804,  806,  807,  808,  809,  811,  812,  813,  826,  840,
       862,  871,  876,  878,  887,  900,  906,  908,  996, 1000,
      1025, 1028, 1030, 1035, 1036, 1038, 1050, 1053, 1056, 1057,
      1058, 1061, 1064, 1068, 1069, 1070, 1071, 1076, 1080, 1081,
      1082, 1094, 1106, 1107, 1109, 1110, 1111, 1113, 1114, 1115,
      1116, 1120, 1121, 1122, 1139, 1141, 1143, 1145, 1147, 1148,
      1150, 1152, 1154, 1158, 1160, 1162, 1164, 1166, 1168, 1170,
      1172, 1176, 1178, 1181, 1183, 1185, 1187, 1189, 1190, 1352,
      1353, 1359, 1361, 1363, 1368
    ],
    meta: { /* ... */ }
  },
  {
    id: 73,
    path: 'node_modules/react/index.js',
    dependencies: [ 72 ],
    dependents: [
       74, 206, 207, 237, 243, 257, 259, 262, 263, 265, 266, 270,
      271, 272, 276, 277, 279, 280, 282, 302, 304, 308, 309, 329,
      330, 336, 339, 344, 345, 374, 375, 376, 378, 380, 383, 387,
      388, 390, 391, 395, 399, 400, 401, 402, 403, 404, 407, 408,
      409, 410, 412, 416, 417, 418, 439, 440, 443, 446, 457, 459,
      460, 461, 462, 449, 464, 465, 466, 467, 468, 469, 470, 397,
      473, 474, 475, 478, 479, 480, 481, 483, 484, 487, 488, 398,
      489, 490, 492, 493, 494, 495, 498, 499, 500, 503, 504, 505,
      506, 507, 508, 512,
      ... 190 more items
    ],
    meta: { /* ... */ }
  },
  {
    id: 1043,
    path: 'node_modules/dripsy/src/index.ts',
    dependencies: [ 1042 ],
    dependents: [ 1120, 1122, 1359, 1361, 1367, 1368 ],
    meta: { /* ... */ }
  }
]

// Dependents
[
  {
    id: 1123,
    path: 'src/components/index.ts',
    dependencies: [ 1120, 1121, 1122 ],
    dependents: [ 1359, 1361 ],
    meta: { /* ... */ }
  }
]

// Inverse dependencies
[
  {
    id: 1123,
    path: 'src/components/index.ts',
    dependencies: [ 1120, 1121, 1122 ],
    dependents: [ 1359, 1361 ],
    meta: { /* ... */ }
  },
  {
    id: 1359,
    path: 'src/screens/MainScreen.tsx',
    dependencies: [
       509,   73,  448,
       518, 1043, 1123,
      1358
    ],
    dependents: [ 1362 ],
    meta: { /* ... */ }
  },
  {
    id: 1361,
    path: 'src/screens/IntroScreen.tsx',
    dependencies: [ 509, 73, 448, 1043, 1123, 1360 ],
    dependents: [ 1362 ],
    meta: { /* ... */ }
  },
  {
    id: 1362,
    path: 'src/screens/index.ts',
    dependencies: [ 1359, 1361 ],
    dependents: [ 1363 ],
    meta: { /* ... */ }
  },
  {
    id: 1363,
    path: 'src/navigators/RootStack.tsx',
    dependencies: [ 509, 73, 1119, 1362 ],
    dependents: [ 1364 ],
    meta: { /* ... */ }
  },
  {
    id: 1364,
    path: 'src/navigators/index.ts',
    dependencies: [ 1363 ],
    dependents: [ 1368 ],
    meta: { /* ... */ }
  },
  {
    id: 1368,
    path: 'src/App.tsx',
    dependencies: [
       509,   73,  518,
       814,  914,  986,
      1043, 1364, 1367
    ],
    dependents: [ 1370 ],
    meta: { /* ... */ }
  },
  {
    id: 1370,
    path: 'index.js',
    dependencies: [ 254, 448, 1368, 1369 ],
    dependents: [],
    meta: { /* ... */ }
  }
]
```

## License

[MIT](./LICENSE)
