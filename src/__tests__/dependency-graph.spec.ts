import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import { DependencyGraph } from '../dependency-graph';

const TEST_MODULE = 'src/screens/MainScreen.tsx';

describe('DependencyGraph', () => {
  let graph: DependencyGraph;

  beforeAll(async () => {
    const rawMetafile = await readFile(
      join(__dirname, './fixtures/metafile.json'),
      'utf-8',
    );
    graph = new DependencyGraph(rawMetafile);
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
      graph.addModule(
        'root/entry.ts',
        ['node_modules/react/index.js', 'node_modules/react-native/index.js'],
        ['index.js'],
      );
      graph.addModule(
        'root/screens.ts',
        ['src/screens/MainScreen.tsx'],
        ['root/entry.ts'],
      );
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
        expect(graph.dependenciesOf('root/entry.ts')).toEqual(
          expect.arrayContaining([
            'node_modules/react/index.js',
            'node_modules/react-native/index.js',
            'root/screens.ts',
          ]),
        );
        expect(graph.dependentsOf('root/entry.ts')).toEqual(
          expect.arrayContaining(['index.js']),
        );

        // root/screens.ts
        expect(graph.dependenciesOf('root/screens.ts')).toEqual(
          expect.arrayContaining(['src/screens/MainScreen.tsx']),
        );
        expect(graph.dependentsOf('root/entry.ts')).toEqual(
          expect.arrayContaining(['index.js']),
        );

        // src/screens/MainScreen.tsx
        const inverseDependencies = graph.inverseDependenciesOf(
          'src/screens/MainScreen.tsx',
        );
        expect(inverseDependencies).toContain('root/screens.ts');
        expect(inverseDependencies).toContain('root/entry.ts');
      });
    });
  });

  describe('updateModule', () => {
    it('should match snapshots', () => {
      graph.addModule('global.ts');
      graph.addModule('re-export.ts');

      graph.updateModule(
        'src/screens/MainScreen.tsx',
        [...graph.dependenciesOf('src/screens/MainScreen.tsx'), 'global.ts'],
        [...graph.dependentsOf('src/screens/MainScreen.tsx'), 're-export.ts'],
      );

      expect(graph.dependenciesOf('re-export.ts')).toMatchSnapshot();
      expect(graph.dependentsOf('global.ts')).toMatchSnapshot();
      expect(
        graph.inverseDependenciesOf('src/screens/MainScreen.tsx'),
      ).toMatchSnapshot();
    });
  });

  describe('removeModule', () => {
    it('should match snapshot', () => {
      graph.removeModule('src/screens/index.ts');
      const inverseDependencies = graph.inverseDependenciesOf(
        'src/screens/MainScreen.tsx',
      );
      expect(inverseDependencies).toMatchSnapshot();
    });
  });

  describe('reset', () => {
    let graph: DependencyGraph;

    beforeAll(async () => {
      const rawMetafile = await readFile(
        join(__dirname, './fixtures/metafile.json'),
        'utf-8',
      );
      graph = new DependencyGraph(rawMetafile);
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
    const ROOT = '/root/workspaces';

    beforeAll(async () => {
      const rawMetafile = await readFile(
        join(__dirname, './fixtures/metafile.json'),
        'utf-8',
      );
      graph = new DependencyGraph(rawMetafile, { root: ROOT });
    });

    it('should able to get the module by its absolute path', () => {
      // Relative
      expect(() =>
        graph.getModule('src/components/Button.tsx'),
      ).not.toThrowError();
      expect(() =>
        graph.getModule('../node_modules/@swc/helpers/esm/_instanceof.js'),
      ).not.toThrowError();

      // Absolute
      expect(() =>
        graph.getModule('/root/workspaces/src/components/Button.tsx'),
      ).not.toThrowError();
      expect(() =>
        graph.getModule('/root/node_modules/@swc/helpers/esm/_instanceof.js'),
      ).not.toThrowError();
    });
  });
});
