#!/usr/bin/env node
/**
 * Grep-style CI guard for the security invariants:
 *  - no API key in URLs (query-string auth is how the old build leaked keys);
 *  - no console logging of key material or captured form content.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC_ROOT = new URL('../extension/src', import.meta.url).pathname;

// URL patterns are skipped for unit-test files: those deliberately construct
// key-in-URL strings to assert the production code strips them.
const URL_KEY_PATTERNS = [
  { pattern: /\?[a-z_]*key=/i, message: 'API key passed as a URL query parameter' },
  { pattern: /[?&]api_?key=/i, message: 'API key passed as a URL query parameter' },
  { pattern: /key=\$\{/, message: 'template-literal key interpolated into a URL' },
];
const LOG_PATTERNS = [
  {
    pattern: /console\.(log|info|debug)\s*\([^)]*(apiKey|api_key|pageContext|getElementText)/,
    message: 'potential logging of key material or captured form content',
  },
];

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      yield* walk(full);
    } else if (/\.tsx?$/.test(entry)) {
      yield full;
    }
  }
}

const problems = [];
for (const filePath of walk(SRC_ROOT)) {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const isTestFile = filePath.includes('__tests__');
  const activePatterns = isTestFile ? LOG_PATTERNS : [...URL_KEY_PATTERNS, ...LOG_PATTERNS];
  lines.forEach((line, index) => {
    for (const { pattern, message } of activePatterns) {
      if (pattern.test(line)) {
        problems.push(`${filePath}:${index + 1}: ${message}`);
      }
    }
  });
}

if (problems.length > 0) {
  console.error(`secret-pattern check failed:\n${problems.map((p) => ` - ${p}`).join('\n')}`);
  process.exit(1);
}

console.log('secret-pattern check passed: no key-in-URL or content-logging patterns');
