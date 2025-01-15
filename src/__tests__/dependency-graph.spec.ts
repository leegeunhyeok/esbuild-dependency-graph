import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import { DependencyGraph } from '../dependency-graph';
import type { Module } from '../types';

const TEST_MODULE = 'src/screens/MainScreen.tsx';

function parsePath(module: Module): string {
  return module.path;
}

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
       * - root/screens.ts (new 1)
       *   - src/screens/MainScreen.tsx
       * - root/entry.ts (new 2)
       *   - node_modules/react/index.js
       *   - node_modules/react-native/index.js
       *   - root/screens.ts
       */
      graph.addModule('root/screens.ts', {
        dependencies: [
          { key: 'src/screens/MainScreen.tsx', source: '@MainScreen' },
        ],
      });
      graph.addModule('root/entry.ts', {
        dependencies: [
          { key: 'node_modules/react/index.js', source: 'react' },
          {
            key: 'node_modules/react-native/index.js',
            source: 'react-native',
          },
          { key: 'root/screens.ts', source: '@root-screens' },
        ],
      });
    });

    describe('when add new modules', () => {
      it('should match snapshots', () => {
        const inverseDependencies = graph.inverseDependenciesOf(
          'src/screens/MainScreen.tsx',
        );
        expect(inverseDependencies).toMatchSnapshot();
      });

      it('should be able to retrieve the added dependencies', () => {
        // root/entry.ts
        expect(graph.dependenciesOf('root/entry.ts').map(parsePath)).toEqual(
          expect.arrayContaining([
            'node_modules/react/index.js',
            'node_modules/react-native/index.js',
            'root/screens.ts',
          ]),
        );

        // root/screens.ts
        expect(graph.dependenciesOf('root/screens.ts').map(parsePath)).toEqual(
          expect.arrayContaining(['src/screens/MainScreen.tsx']),
        );
        expect(graph.dependentsOf('root/screens.ts').map(parsePath)).toEqual(
          expect.arrayContaining(['root/entry.ts']),
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
      graph.addModule('global.ts', { dependencies: [] });
      graph.addModule('re-export.ts', {
        dependencies: [
          { key: 'src/screens/MainScreen.tsx', source: '@MainScreen' },
        ],
      });

      const prevModule = graph.getModule('src/screens/MainScreen.tsx');
      const prevDependencies = prevModule.dependencies.map(
        ({ id, source }) => ({
          key: id,
          source,
        }),
      );

      graph.updateModule('src/screens/MainScreen.tsx', {
        dependencies: [
          ...prevDependencies,
          // Add new dependency
          { key: 'global.ts', source: '@global' },
        ],
      });

      // src/screens/index.ts << should keep the same dependencies after update.
      //   src/screens/MainScreen.tsx (updated)
      //   src/screens/IntroScreen.tsx
      expect(
        graph.dependenciesOf('src/screens/index.ts').map(parsePath),
      ).toEqual(
        expect.arrayContaining([
          'src/screens/MainScreen.tsx',
          'src/screens/IntroScreen.tsx',
        ]),
      );

      expect(graph.dependenciesOf('re-export.ts').map(parsePath)).toEqual(
        expect.arrayContaining(['src/screens/MainScreen.tsx']),
      );
      expect(graph.dependentsOf('global.ts').map(parsePath)).toEqual(
        expect.arrayContaining(['src/screens/MainScreen.tsx']),
      );
    });
  });

  describe('removeModule', () => {
    it('should match snapshot', () => {
      const prevSize = graph.size;

      graph.removeModule('src/screens/index.ts');
      const inverseDependencies = graph.inverseDependenciesOf(
        'src/screens/MainScreen.tsx',
      );

      expect(inverseDependencies.map(parsePath)).not.contains(
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

      graph.addModule('/root/workspace/index.js', { dependencies: [] });
      graph.addModule('/root/workspace/src/App.tsx', { dependencies: [] });
      graph.addModule('/root/workspace/src/screens/MainScreen.tsx', {
        dependencies: [],
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
      const dependencies = graph.dependenciesOf(indexModule.path);
      expect(dependencies.length).toBeGreaterThan(0);
      expect(dependencies).toMatchSnapshot();
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
});
