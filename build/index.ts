import { resolve } from 'node:path';
import * as esbuild from 'esbuild';
import type { BuildOptions } from 'esbuild';

const COMMON_BUILD_OPTIONS: BuildOptions = {
  entryPoints: [resolve(__dirname, '../src/index.ts')],
  platform: 'node',
  bundle: true,
  outdir: 'dist',
};

async function build(): Promise<void> {
  await Promise.all([
    // default
    esbuild.build(COMMON_BUILD_OPTIONS),
    // cjs
    esbuild.build({
      ...COMMON_BUILD_OPTIONS,
      format: 'cjs',
      outExtension: { '.js': '.cjs' },
    }),
    // esm
    esbuild.build({
      ...COMMON_BUILD_OPTIONS,
      format: 'esm',
      outExtension: { '.js': '.mjs' },
    }),
  ]);
}

build().catch((error) => {
  console.error('build failed', error);
  process.exit(1);
});
