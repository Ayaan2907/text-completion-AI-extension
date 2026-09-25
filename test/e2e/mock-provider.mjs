#!/usr/bin/env node
/**
 * Minimal OpenAI-compatible mock provider for the extension e2e.
 *
 * The extension's BYOK endpoint is pointed at this server. It counts every
 * prediction request it receives so the e2e can assert that typing in a
 * sensitive field produced NO outbound request while typing in a legal
 * drafting field produced exactly one.
 *
 * Endpoints:
 *   POST /v1/chat/completions  -> OpenAI chat completion with fixed text
 *   GET  /stats                -> { count } for e2e assertions
 */
import { createServer } from 'node:http';

const PORT = Number(process.env.MOCK_PROVIDER_PORT ?? 8788);
let count = 0;

const server = createServer((req, res) => {
  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/stats') {
    res.writeHead(200, { 'content-type': 'application/json', ...cors });
    res.end(JSON.stringify({ count }));
    return;
  }

  if (req.method === 'POST' && req.url === '/v1/chat/completions') {
    // Put the request stream into flowing mode so 'end' fires even though
    // the body content is not needed.
    req.resume();
    req.on('end', () => {
      count++;
      res.writeHead(200, { 'content-type': 'application/json', ...cors });
      res.end(
        JSON.stringify({
          choices: [
            {
              message: {
                role: 'assistant',
                content: ' shall be liable only for losses caused by its own negligence.',
              },
            },
          ],
        }),
      );
    });
    return;
  }

  res.writeHead(404, cors);
  res.end('not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`mock provider listening on http://127.0.0.1:${PORT}`);
});
