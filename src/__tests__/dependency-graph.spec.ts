import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe } from '@jest/globals';
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
});
