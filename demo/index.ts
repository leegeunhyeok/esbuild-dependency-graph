import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Metafile } from 'esbuild';
import { DependencyGraph } from '../src/DependencyGraph';

const ENTRY_POINT = 'index.js';
const TEST_MODULE = 'src/components/Section.tsx';

function dependencyPathMapper(
  dependencies: number[],
  graph: DependencyGraph,
): { id: number; path: string }[] {
  return dependencies.map((moduleId) => ({
    id: moduleId,
    path: graph.getModule(moduleId)!.path,
  }));
}

async function main(): Promise<void> {
  const rawMetafile = await readFile(
    join(__dirname, '../src/__tests__/fixtures/metafile.json'),
    'utf-8',
  );
  const metafile = JSON.parse(rawMetafile) as Metafile;

  const graph = new DependencyGraph(metafile, ENTRY_POINT);
  const testModuleId = graph.getModuleId(TEST_MODULE)!;

  console.log({
    id: testModuleId,
    path: graph.getModule(testModuleId)?.path,
    dependencies: dependencyPathMapper(
      graph.dependenciesOf(testModuleId),
      graph,
    ),
    inverseDependencies: dependencyPathMapper(
      graph.inverseDependenciesOf(testModuleId),
      graph,
    ),
  });
}

main().catch(console.error);
