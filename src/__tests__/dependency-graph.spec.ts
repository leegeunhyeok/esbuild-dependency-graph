import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import { DependencyGraph } from '../dependency-graph';
import type { Module } from '../types';

const TEST_MODULE = 'src/screens/MainScreen.tsx';

describe('DependencyGraph', () => {
  let graph: DependencyGraph;

  beforeAll(async () => {
    const rawMetafile = await readFile(
      join(__dirname, './fixtures/metafile.json'),
      'utf-8',
    );
    graph = new DependencyGraph().load(rawMetafile);
  });

  describe('size', () => {
    it('should match snapshot', () => {
      expect(graph.size).toMatchSnapshot();
    });
  });

  describe('dependenciesOf', () => {
    it('should match snapshot', () => {
      expect(graph.dependenciesOf(TEST_MODULE)).toMatchSnapshot();
    });
  });

  describe('dependentsOf', () => {
    it('should match snapshot', () => {
      expect(graph.dependentsOf(TEST_MODULE)).toMatchSnapshot();
    });
  });

  describe('inverseDependenciesOf', () => {
    it('should match snapshot', () => {
      expect(graph.inverseDependenciesOf(TEST_MODULE)).toMatchSnapshot();
    });
  });

  describe('hasModule', () => {
    it('should returns `true` if module exists', () => {
      expect(graph.hasModule('src/screens/MainScreen.tsx')).toBe(true);
    });

    it('should returns `false` if module is not exists', () => {
      expect(graph.hasModule('not/registered/module.ts')).toBe(false);
    });
  });

  describe('addModule', () => {
    beforeAll(() => {
      /**
       * `src/screens/MainScreen.tsx`
       *
       * **Dependencies**
       * - node_modules/react/jsx-runtime.js
       * - node_modules/react/index.js
       * - node_modules/react-native/index.js
       * - node_modules/react-native-safe-area-context/src/index.tsx
       * - node_modules/dripsy/src/index.ts
       * - src/components/index.ts
       * - src/assets/logo.svg
       *
       * **Dependents**
       * - src/screens/index.ts
       *
       * ---
       *
       * **Expected**
       *
       * - index.js
       *   - root/entry.ts
       *     - node_modules/react/index.js
       *     - node_modules/react-native/index.js
       *     - root/screens.ts
       *   - root/screens.ts
       *     - src/screens/MainScreen.tsx
       */
      graph.addModule('root/entry.ts', {
        dependencies: [
          'node_modules/react/index.js',
          'node_modules/react-native/index.js',
        ],
        dependents: ['index.js'],
        meta: { imports: {} },
      });
      graph.addModule('root/screens.ts', {
        dependencies: ['src/screens/MainScreen.tsx'],
        dependents: ['root/entry.ts'],
        meta: { imports: {} },
      });
    });

    describe('when add new modules', () => {
      function parsePath(module: Module): string {
        return module.path;
      }

      it('should match snapshots', () => {
        const inverseDependencies = graph.inverseDependenciesOf(
          'src/screens/MainScreen.tsx',
        );
        expect(inverseDependencies).toMatchSnapshot();
      });

      it('should be able to retrieve the added dependencies', () => {
        expect(graph.dependenciesOf('root/entry.ts').map(parsePath)).toEqual(
          expect.arrayContaining([
            'node_modules/react/index.js',
            'node_modules/react-native/index.js',
            'root/screens.ts',
          ]),
        );
        expect(graph.dependentsOf('root/entry.ts').map(parsePath)).toEqual(
          expect.arrayContaining(['index.js']),
        );

        // root/screens.ts
        expect(graph.dependenciesOf('root/screens.ts').map(parsePath)).toEqual(
          expect.arrayContaining(['src/screens/MainScreen.tsx']),
        );
        expect(graph.dependentsOf('root/entry.ts').map(parsePath)).toEqual(
          expect.arrayContaining(['index.js']),
        );

        // src/screens/MainScreen.tsx
        const inverseDependencies = graph.inverseDependenciesOf(
          'src/screens/MainScreen.tsx',
        );
        expect(inverseDependencies.map(parsePath)).toContain('root/screens.ts');
        expect(inverseDependencies.map(parsePath)).toContain('root/entry.ts');
      });
    });
  });

  describe('updateModule', () => {
    it('should match snapshots', () => {
      graph.addModule('global.ts', {
        dependencies: [],
        dependents: [],
        meta: { imports: {} },
      });
      graph.addModule('re-export.ts', {
        dependencies: [],
        dependents: [],
        meta: { imports: {} },
      });

      graph.updateModule('src/screens/MainScreen.tsx', {
        dependencies: [
          ...graph
            .dependenciesOf('src/screens/MainScreen.tsx')
            .map(({ id }) => id),
          'global.ts',
        ],
        dependents: [
          ...graph
            .dependentsOf('src/screens/MainScreen.tsx')
            .map(({ id }) => id),
          're-export.ts',
        ],
        meta: { imports: {} },
      });

      expect(graph.dependenciesOf('re-export.ts')).toMatchSnapshot();
      expect(graph.dependentsOf('global.ts')).toMatchSnapshot();
      expect(
        graph.inverseDependenciesOf('src/screens/MainScreen.tsx'),
      ).toMatchSnapshot();
    });
  });

  describe('removeModule', () => {
    it('should match snapshot', () => {
      const prevSize = graph.size;

      graph.removeModule('src/screens/index.ts');
      const inverseDependencies = graph.inverseDependenciesOf(
        'src/screens/MainScreen.tsx',
      );
      expect(inverseDependencies).toMatchSnapshot();
      expect(graph.size).toEqual(prevSize - 1);
    });
  });

  describe('lazy load', () => {
    const ROOT = '/root/workspace';
    let graph: DependencyGraph;

    beforeAll(() => {
      graph = new DependencyGraph({ root: ROOT });

      graph.addModule('/root/workspace/index.js', {
        dependencies: [],
        dependents: [],
        meta: { imports: {} },
      });
      graph.addModule('/root/workspace/src/App.tsx', {
        dependencies: [],
        dependents: [],
        meta: { imports: {} },
      });
      graph.addModule('/root/workspace/src/screens/MainScreen.tsx', {
        dependencies: [],
        dependents: [],
        meta: { imports: {} },
      });
    });

    it('should update module data', async () => {
      const indexModule = graph.getModule('/root/workspace/index.js');
      const appModule = graph.getModule('/root/workspace/src/App.tsx');
      const mainScreenModule = graph.getModule(
        '/root/workspace/src/screens/MainScreen.tsx',
      );

      // Before update
      expect(graph.dependenciesOf(indexModule.path)).toHaveLength(0);
      expect(graph.dependenciesOf(appModule.path)).toHaveLength(0);
      expect(graph.dependenciesOf(mainScreenModule.path)).toHaveLength(0);

      const rawMetafile = await readFile(
        join(__dirname, './fixtures/metafile.json'),
        'utf-8',
      );

      // Load after add some modules.
      graph.load(rawMetafile);

      // After update
      expect(graph.dependenciesOf(indexModule.path)).toMatchSnapshot();
      console.log(indexModule.meta);
    });
  });

  describe('reset', () => {
    let graph: DependencyGraph;

    beforeAll(async () => {
      const rawMetafile = await readFile(
        join(__dirname, './fixtures/metafile.json'),
        'utf-8',
      );
      graph = new DependencyGraph().load(rawMetafile);
    });

    it('should reset dependency graph', () => {
      graph.reset();

      expect(() =>
        graph.getModule('src/screens/MainScreen.tsx'),
      ).toThrowError();
    });
  });

  describe('when `root` path is provided', () => {
    let graph: DependencyGraph;
    const ROOT = '/root/workspace';

    beforeAll(async () => {
      const rawMetafile = await readFile(
        join(__dirname, './fixtures/metafile.json'),
        'utf-8',
      );
      graph = new DependencyGraph({ root: ROOT }).load(rawMetafile);
    });

    it('should able to get the module by its absolute path', () => {
      // Relative
      expect(() =>
        graph.getModule('../node_modules/@swc/helpers/esm/_instanceof.js'),
      ).not.toThrowError();
      expect(() =>
        graph.getModule('src/components/Button.tsx'),
      ).not.toThrowError();

      // Absolute
      expect(() =>
        graph.getModule('/root/workspace/src/components/Button.tsx'),
      ).not.toThrowError();
      expect(() =>
        graph.getModule('/root/node_modules/@swc/helpers/esm/_instanceof.js'),
      ).not.toThrowError();
    });
  });

  describe('strict mode', () => {
    let graph: DependencyGraph;

    beforeAll(() => {
      graph = new DependencyGraph({ strict: true });
      graph.addModule('index.js', {
        dependencies: [],
        dependents: [],
        meta: { imports: {} },
      });
      graph.addModule('a.js', {
        dependencies: [],
        dependents: [],
        meta: { imports: {} },
      });
      graph.addModule('b.js', {
        dependencies: [],
        dependents: [],
        meta: { imports: {} },
      });
      graph.addModule('c.js', {
        dependencies: [],
        dependents: [],
        meta: { imports: {} },
      });
    });

    it('should throw an error if there is a mismatch between the dependency information and metadata', () => {
      expect(() =>
        graph.updateModule('index.js', {
          dependencies: ['a.js', 'b.js', 'c.js'],
          dependents: [],
          meta: {
            imports: {
              // 'a.js' is not included in meta
              './b': 'b.js',
              './c': 'c.js',
            },
          },
        }),
      ).toThrow();
      expect(() =>
        graph.updateModule('index.js', {
          dependencies: ['a.js', 'b.js', 'c.js'],
          dependents: [],
          meta: {
            imports: {
              // 'a.js', 'b.js', 'c.js' modules are included
              './a': 'a.js',
              './b': 'b.js',
              './c': 'c.js',
            },
          },
        }),
      ).not.toThrow();
    });
  });
});
