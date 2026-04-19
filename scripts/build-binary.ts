#!/usr/bin/env tsx
/**
 * Builds self-contained single-file binaries for all platforms.
 *
 * Steps:
 *  1. Bundle server with esbuild (CJS, all deps inlined)
 *  2. Package with @yao-pkg/pkg for each target platform
 */

import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SERVER_DIR = join(ROOT, 'apps', 'server');
const BUNDLE = join(ROOT, 'dist', 'kyuu-bundle.cjs');
const OUT_DIR = join(ROOT, 'dist', 'binaries');

const TARGETS = [
  { name: 'linux-x64',   pkg: 'node20-linux-x64'   },
  { name: 'linux-arm64', pkg: 'node20-linux-arm64'  },
  { name: 'macos-x64',   pkg: 'node20-macos-x64'    },
  { name: 'macos-arm64', pkg: 'node20-macos-arm64'  },
  { name: 'windows-x64', pkg: 'node20-win-x64', ext: '.exe' },
];

try {
  execSync(`mkdir -p ${OUT_DIR}`);

  // 1. Bundle with esbuild
  console.log('\n[1/2] Bundling server...');
  execSync(
    [
      'npx esbuild src/index.ts',
      '--bundle',
      '--platform=node',
      '--format=cjs',
      `--outfile=${BUNDLE}`,
      '--banner:js="const _importMetaUrl=require(\'url\').pathToFileURL(__filename).href;"',
      '--define:import.meta.url=_importMetaUrl',
    ].join(' '),
    { cwd: SERVER_DIR, stdio: 'inherit' }
  );

  // 2. Package for each platform
  console.log('\n[2/2] Packaging binaries...');
  for (const { name, pkg, ext = '' } of TARGETS) {
    const outFile = join(OUT_DIR, `kyuu-${name}${ext}`);
    console.log(`  → ${name}`);
    execSync(
      `npx @yao-pkg/pkg ${BUNDLE} --targets ${pkg} --output ${outFile}`,
      { stdio: 'inherit' }
    );
  }

  console.log('\n✓ Binaries written to dist/binaries/');
  for (const { name, ext = '' } of TARGETS) {
    console.log(`  dist/binaries/kyuu-${name}${ext}`);
  }

} catch (err) {
  console.error('\nBuild failed:', err);
  process.exit(1);
}
