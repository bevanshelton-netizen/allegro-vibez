import http from 'node:http';
import { createAdapterRegistry } from './adapters/index.mjs';

const port = Number(process.env.PORT || 8787);
const adapters = createAdapterRegistry();

function sendJson(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  });
  res.end(JSON.stringify(body));
}

function route(req) {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  return { method: req.method ?? 'GET', path: url.pathname };
}

const server = http.createServer((req, res) => {
  const { method, path } = route(req);

  if (method === 'GET' && (path === '/healthz' || path === '/api/v1/health')) {
    return sendJson(res, 200, {
      ok: true,
      service: 'allegro-vibez-api',
      mode: 'foundation',
      persistence: 'NOT_CONFIGURED'
    });
  }

  if (path.startsWith('/api/v1/')) {
    return sendJson(res, 501, {
      error: {
        code: 'NOT_CONFIGURED',
        message: 'Production service adapter is not configured yet.',
        path,
        method,
        adapters: Object.fromEntries(
          Object.entries(adapters).map(([name, adapter]) => [name, adapter.status])
        )
      }
    });
  }

  return sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Route not found.' } });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`ALLEGRO-VIBEZ API foundation listening on :${port}`);
});
