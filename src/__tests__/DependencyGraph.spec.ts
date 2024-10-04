import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe } from '@jest/globals';
import type { Metafile } from 'esbuild';
import { DependencyGraph } from '../DependencyGraph';

const TEST_MODULE = 'src/screens/MainScreen.tsx';

describe('DependencyGraph', () => {
  let metafile: Metafile;
  let graph: DependencyGraph;

  beforeAll(async () => {
    metafile = JSON.parse(
      await readFile(join(__dirname, './fixtures/metafile.json'), 'utf-8'),
    ) as Metafile;
    graph = new DependencyGraph(metafile);
  });

  describe('dependenciesOf', () => {
    it('should match snapshot', () => {
      expect(graph.dependenciesOf(TEST_MODULE)).toMatchSnapshot();
    });
  });

  describe('inverseDependenciesOf', () => {
    it('should match snapshot', () => {
      expect(graph.inverseDependenciesOf(TEST_MODULE)).toMatchSnapshot();
    });
  });
});
