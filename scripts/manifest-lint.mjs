#!/usr/bin/env node
/**
 * MV3 least-privilege lint for the extension manifest. Enforces the store
 * posture the pivot requires:
 *  - no static content_scripts (injection happens only for user-granted origins);
 *  - no granted host permissions (site/provider access is optional + runtime);
 *  - permissions restricted to storage/activeTab/scripting.
 */
import { readFileSync } from 'node:fs';

const manifestPath = new URL('../extension/src/manifest.json', import.meta.url);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const ALLOWED_PERMISSIONS = new Set(['storage', 'activeTab', 'scripting']);
const problems = [];

if (manifest.manifest_version !== 3) {
  problems.push(`manifest_version must be 3, got ${manifest.manifest_version}`);
}
for (const permission of manifest.permissions ?? []) {
  if (!ALLOWED_PERMISSIONS.has(permission)) {
    problems.push(`permission "${permission}" is not on the allowlist`);
  }
}
if ((manifest.host_permissions ?? []).length > 0) {
  problems.push(
    `static host_permissions are forbidden, got: ${JSON.stringify(manifest.host_permissions)}`,
  );
}
if ((manifest.content_scripts ?? []).length > 0) {
  problems.push(
    'static content_scripts are forbidden — register for user-granted origins at runtime',
  );
}
if ((manifest.optional_host_permissions ?? []).length === 0) {
  problems.push('optional_host_permissions must exist so users can grant sites at runtime');
}
if (manifest.background?.service_worker !== 'background.js') {
  problems.push('background.service_worker must be background.js');
}

if (problems.length > 0) {
  console.error(`manifest lint failed:\n${problems.map((p) => ` - ${p}`).join('\n')}`);
  process.exit(1);
}

console.log('manifest lint passed: least-privilege MV3 posture OK');
