import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Metafile } from 'esbuild';
import { EsbuildDependencyManager } from '../src/EsbuildDependencyManger';

const ENTRY_POINT = 'index.js';
const TEST_MODULE = 'src/screens/MainScreen.tsx';

function dependencyPathMapper(
  dependencies: number[],
  manager: EsbuildDependencyManager,
): { id: number; path: string }[] {
  return dependencies.map((moduleId) => ({
    id: moduleId,
    path: manager.getModuleById(moduleId)!.path,
  }));
}

async function main(): Promise<void> {
  const rawMetafile = await readFile(
    join(__dirname, '../src/__tests__/fixtures/metafile.json'),
    'utf-8',
  );
  const metafile = JSON.parse(rawMetafile) as Metafile;

  const dependencyManager = new EsbuildDependencyManager(metafile, ENTRY_POINT);
  const dependencyGraph = dependencyManager.getDependencyGraph();
  const testModuleId = dependencyManager.getModuleId(TEST_MODULE)!;

  console.log({
    id: testModuleId,
    path: dependencyManager.getModuleById(testModuleId)?.path,
    dependencies: dependencyPathMapper(
      Array.from(dependencyGraph[testModuleId].dependencies),
      dependencyManager,
    ),
    inverseDependencies: dependencyPathMapper(
      dependencyManager.getInverseDependencies(testModuleId),
      dependencyManager,
    ),
  });
}

main().catch(console.error);
