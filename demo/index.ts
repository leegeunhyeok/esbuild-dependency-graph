import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Metafile } from 'esbuild';
import type { EsbuildModule, InternalModule } from '../src/types';
import { DependencyGraph } from '../src/DependencyGraph';

const ENTRY_POINT = 'index.js';
const TEST_MODULE = 'src/components/Section.tsx';

function importsMapper(imports: EsbuildModule['imports']): {
  path: string;
  original: string;
}[] {
  return imports.map((importMeta) => ({
    path: importMeta.path,
    original: importMeta.original ?? '<unknown>',
  }));
}

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

  const graph = new DependencyGraph(metafile, ENTRY_POINT, {
    'node_modules/react/jsx-runtime.js': 1,
    'node_modules/react/index.js': 2,
    'node_modules/dripsy/src/index.ts': 3,
  });
  const testModuleId = graph.getModuleId(TEST_MODULE)!;
  const module = graph.getModule(testModuleId) as InternalModule;

  console.log(JSON.stringify({
    id: testModuleId,
    path: module.path,
    format: module.format,
    imports: importsMapper(module.imports),
    dependencies: dependencyPathMapper(
      graph.dependenciesOf(testModuleId),
      graph,
    ),
    inverseDependencies: dependencyPathMapper(
      graph.inverseDependenciesOf(testModuleId),
      graph,
    ),
  }, null, 2));
}

main().catch(console.error);
