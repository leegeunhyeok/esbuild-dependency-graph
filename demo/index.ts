import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DependencyGraph } from '../src/dependency-graph';

const TEST_MODULE = 'src/components/Section.tsx';

async function main(): Promise<void> {
  const rawMetafile = await readFile(
    join(__dirname, '../src/__tests__/fixtures/metafile.json'),
    'utf-8',
  );

  const graph = new DependencyGraph().load(rawMetafile);
  const module = graph.getModule(TEST_MODULE);

  print(`Module: ${TEST_MODULE}`, module);
  print('Dependencies', graph.dependenciesOf(TEST_MODULE));
  print('Dependents', graph.dependentsOf(TEST_MODULE));
  print('Inverse dependencies', graph.inverseDependenciesOf(TEST_MODULE));
}

function print(label: string, data: unknown) {
  console.log(label, JSON.stringify(data, null, 2));
}

main().catch(console.error);
