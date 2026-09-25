#!/usr/bin/env node
/**
 * Prepares the e2e extension build at /tmp/e2e-dist:
 *  1. copies the webpack build (extension/dist),
 *  2. adds host_permissions for the local fixture/mock origins.
 *
 * The shipped source manifest grants NO host permissions (enforced by
 * scripts/manifest-lint.mjs). This patch exists purely to emulate, in the
 * e2e, the exact origin grant a real user approves at runtime — it is never
 * shipped or committed.
 */
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const SOURCE = new URL('../../extension/dist', import.meta.url).pathname;
const DEST = join(tmpdir(), 'e2e-dist');
const FIXTURE_ORIGINS = ['http://127.0.0.1:8787/*', 'http://127.0.0.1:8788/*'];

mkdirSync(DEST, { recursive: true });
cpSync(SOURCE, DEST, { recursive: true });

const manifestPath = join(DEST, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
manifest.host_permissions = FIXTURE_ORIGINS;

// Pin a stable dev extension ID with a throwaway public key (test-only —
// unpacked builds are unsigned; this key never signs anything).
const { publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const der = publicKey.export({ type: 'spki', format: 'der' });
manifest.key = der.toString('base64');

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

// Chrome extension ID = first 16 bytes of SHA-256(DER pubkey), hex mapped 0-9a-f -> a-p.
const hash = createHash('sha256').update(der).digest('hex').slice(0, 32);
const id = [...hash].map((ch) => String.fromCharCode('a'.charCodeAt(0) + parseInt(ch, 16))).join('');

console.log(`e2e extension prepared at ${DEST}`);
console.log(`extension id: ${id}`);
console.log(`popup url: chrome-extension://${id}/popup.html`);
