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

  describe('inverseDependenciesOf', () => {
    it('should match snapshot', () => {
      expect(graph.inverseDependenciesOf(TEST_MODULE)).toMatchSnapshot();
    });
  });
});
