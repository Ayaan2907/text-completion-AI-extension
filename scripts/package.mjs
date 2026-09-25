#!/usr/bin/env node
/**
 * Packages the production build into a Chrome Web Store upload artifact.
 * Expects `npm run build:prod` to have produced extension/dist.
 *
 * The manifest must sit at the ZIP root. No `zip` binary is assumed: the
 * archive is written with python3's zipfile module (stdlib, dependency-free).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'extension', 'dist');
const OUT_DIR = join(ROOT, 'dist-packages');
mkdirSync(OUT_DIR, { recursive: true });

const manifest = JSON.parse(readFileSync(join(DIST, 'manifest.json'), 'utf8'));
const outName = `draft-assist-v${manifest.version}.zip`;

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

const files = [...walk(DIST)];
if (!files.some((f) => relative(DIST, f) === 'manifest.json')) {
  console.error('extension/dist/manifest.json missing — run npm run build:prod first.');
  process.exit(1);
}

execFileSync('python3', [
  '-m', 'zipfile', '-c',
  join(OUT_DIR, outName),
  ...files.map((f) => relative(DIST, f)),
], { cwd: DIST, stdio: 'inherit' });

console.log(`packaged ${files.length} files -> dist-packages/${outName}`);
