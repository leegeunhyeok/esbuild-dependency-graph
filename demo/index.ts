import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DependencyGraph } from '../src/DependencyGraph';

const TEST_MODULE = 'src/components/Section.tsx';

async function main(): Promise<void> {
  const rawMetafile = await readFile(
    join(__dirname, '../src/__tests__/fixtures/metafile.json'),
    'utf-8',
  );

  const graph = new DependencyGraph(rawMetafile);
  const module = graph.getModule(TEST_MODULE);

  console.log(`Module: ${TEST_MODULE}`, module);
  console.log('Dependencies', graph.dependenciesOf(TEST_MODULE));
  console.log('Inverse dependencies', graph.inverseDependenciesOf(TEST_MODULE));
}

main().catch(console.error);
