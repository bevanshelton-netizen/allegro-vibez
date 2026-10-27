import http from 'node:http';
import { createAdapterRegistry } from './adapters/index.mjs';
import { createRepository, RepositoryNotConfiguredError } from './domain/repository.mjs';
import { jsonBody } from './domain/validation.mjs';
import { register, login, currentUser } from './services/identity.mjs';

const port = Number(process.env.PORT || 8787);
const adapters = createAdapterRegistry();
const repository = createRepository();

function sendJson(res, status, body, extraHeaders = {}) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...extraHeaders
  });
  res.end(JSON.stringify(body));
}

function route(req) {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  return { method: req.method ?? 'GET', path: url.pathname };
}

function bearerToken(req) {
  const header = req.headers.authorization ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
}

function statusFor(error) {
  if (error instanceof RepositoryNotConfiguredError || error.code === 'NOT_CONFIGURED') return 501;
  if (error.code === 'INVALID_REQUEST' || error.code === 'INVALID_JSON') return 400;
  if (error.code === 'PAYLOAD_TOO_LARGE') return 413;
  if (error.code === 'UNAUTHORIZED') return 401;
  if (error.code === 'CONFLICT') return 409;
  return 500;
}

function errorBody(error, path) {
  const status = statusFor(error);
  return {
    error: {
      code: error.code ?? (status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'),
      message: error.message,
      path
    }
  };
}

const server = http.createServer(async (req, res) => {
  const { method, path } = route(req);

  try {
    if (method === 'GET' && (path === '/healthz' || path === '/api/v1/health')) {
      return sendJson(res, 200, {
        ok: true,
        service: 'allegro-vibez-api',
        mode: 'foundation',
        persistence: 'NOT_CONFIGURED'
      });
    }

    if (method === 'POST' && path === '/api/v1/auth/register') {
      const body = await jsonBody(req);
      const result = await register({ repository, body });
      return sendJson(res, 201, { data: result });
    }

    if (method === 'POST' && path === '/api/v1/auth/login') {
      const body = await jsonBody(req);
      const result = await login({ repository, body });
      return sendJson(res, 200, { data: result });
    }

    if (method === 'GET' && path === '/api/v1/me') {
      const user = await currentUser({ repository, token: bearerToken(req) });
      return sendJson(res, 200, { data: user });
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
  } catch (error) {
    return sendJson(res, statusFor(error), errorBody(error, path));
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`ALLEGRO-VIBEZ API foundation listening on :${port}`);
});
