# esbuild-dependency-graph

> Dependency graph helper based on esbuild's metafile

## Installation

```bash
npm install esbuild-dependency-graph
# or yarn
yarn add esbuild-dependency-graph
```

## Usage

```ts
import { EsbuildDependencyManager } from 'esbuild-dependency-graph';

const dependencyManager = new EsbuildDependencyManager(metafile, 'entry.ts');

// Get module id
dependencyManager.getModuleId('path/to/code.ts'); // ModuleId

// Get module
dependencyManager.getModule('path/to/code.ts'); // Module | null

// Get module by id
dependencyManager.getModuleById(moduleId); // Module | null

// Get `ModuleMap`
dependencyManager.getModuleMap(); // ModuleMap

// Get `ModuleDependencyGraph`
dependencyManager.getDependencyGraph(); // ModuleDependencyGraph

// Get inverse dependencies
dependencyManager.getInverseDependencies(); // ModuleId[]
```

```ts
type ModuleId = number;
type ModuleMap = Record<ModuleId, Module>;
type Module = Metafile['inputs'][string] & {
  path: string;
};

type ModuleDependencyGraph = Record<ModuleId, ModuleNode>;
```

## Demo

Demo code [here](./demo/index.ts).

```json
{
  "id": 1358,
  "path": "src/screens/MainScreen.tsx",
  "dependencies": [
    { "id": 510, "path": "node_modules/react/jsx-runtime.js" },
    { "id": 74, "path": "node_modules/react/index.js" },
    { "id": 449, "path": "node_modules/react-native/index.js" },
    {
      "id": 519,
      "path": "node_modules/react-native-safe-area-context/src/index.tsx"
    },
    { "id": 1043, "path": "node_modules/dripsy/src/index.ts" },
    { "id": 1122, "path": "src/components/index.ts" },
    { "id": 1357, "path": "src/assets/logo.svg" }
  ],
  "inverseDependencies": [
    { "id": 1358, "path": "src/screens/MainScreen.tsx" },
    { "id": 1361, "path": "src/screens/index.ts" },
    { "id": 1362, "path": "src/navigators/RootStack.tsx" },
    { "id": 1363, "path": "src/navigators/index.ts" },
    { "id": 1367, "path": "src/App.tsx" },
    { "id": 0, "path": "index.js" }
  ]
}
```

## License

[MIT](./LICENSE)
