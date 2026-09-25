#!/usr/bin/env node
/**
 * Static fixture server for the extension e2e (serves test/e2e/fixture).
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const PORT = Number(process.env.FIXTURE_PORT ?? 8787);
const ROOT = new URL('./fixture', import.meta.url).pathname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`);
  const relative = normalize(url.pathname).replace(/^([/\\]|\.\.)+/, '');
  const filePath = join(ROOT, relative === '' ? 'legal-form.html' : relative);
  try {
    const content = await readFile(filePath);
    res.writeHead(200, { 'content-type': MIME[extname(filePath)] ?? 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`fixture server listening on http://127.0.0.1:${PORT}`);
});
