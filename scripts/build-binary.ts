#!/usr/bin/env bun
/**
 * Builds self-contained single-file binaries for all platforms.
 *
 * Steps:
 *  1. bun build --compile for each target platform
 */

import { execSync } from 'child_process';
import { join } from 'path';

const ROOT = join(import.meta.dir, '..');
const OUT_DIR = join(ROOT, 'dist', 'binaries');

const TARGETS = [
  { name: 'linux-x64',   target: 'bun-linux-x64'   },
  { name: 'linux-arm64', target: 'bun-linux-arm64'  },
  { name: 'macos-x64',   target: 'bun-darwin-x64'   },
  { name: 'macos-arm64', target: 'bun-darwin-arm64'  },
  { name: 'windows-x64', target: 'bun-windows-x64', ext: '.exe' },
];

try {
  execSync(`mkdir -p ${OUT_DIR}`);

  console.log('\n[1/1] Compiling binaries...');
  for (const { name, target, ext = '' } of TARGETS) {
    const outFile = join(OUT_DIR, `kyuu-${name}${ext}`);
    console.log(`  → ${name}`);
    execSync(
      `bun build --compile --target=${target} src/index.ts --outfile=${outFile}`,
      { cwd: join(ROOT, 'apps/server'), stdio: 'inherit' }
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
