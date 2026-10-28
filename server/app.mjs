import http from 'node:http';
import { createAdapterRegistry } from './adapters/index.mjs';
import { createRepository, RepositoryNotConfiguredError } from './domain/repository.mjs';
import { createSupabaseRepository } from './adapters/supabase-repository.mjs';
import { jsonBody, id } from './domain/validation.mjs';
import { register, login, currentUser } from './services/identity.mjs';
import { createArtist, listArtists, getArtist, updateArtist } from './services/artists.mjs';
import { createRelease, getRelease, submitRelease } from './services/releases.mjs';
import { setRightsSplits, getRightsSplits } from './services/rights.mjs';
import { getEarnings, requestPayout } from './services/earnings.mjs';
import { createOrder, getOrder, verifyPayment } from './services/payments.mjs';
import { createUploadIntent, getAsset } from './services/media.mjs';

const port = Number(process.env.PORT || 8787);
const adapters = createAdapterRegistry();
const persistenceConfigured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const repository = persistenceConfigured ? createSupabaseRepository() : createRepository();
function sendJson(res, status, body, extraHeaders = {}) { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...extraHeaders }); res.end(JSON.stringify(body)); }
function route(req) { const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`); return { method: req.method ?? 'GET', path: url.pathname, search: url.searchParams }; }
function bearerToken(req) { const header = req.headers.authorization ?? ''; return header.startsWith('Bearer ') ? header.slice(7).trim() : null; }
function statusFor(error) { if (error instanceof RepositoryNotConfiguredError || error.code === 'NOT_CONFIGURED') return 501; if (error.code === 'INVALID_REQUEST' || error.code === 'INVALID_JSON') return 400; if (error.code === 'PAYLOAD_TOO_LARGE') return 413; if (error.code === 'UNAUTHORIZED') return 401; if (error.code === 'FORBIDDEN') return 403; if (error.code === 'NOT_FOUND') return 404; if (error.code === 'CONFLICT') return 409; return 500; }
function errorBody(error, path) { const status = statusFor(error); return { error: { code: error.code ?? (status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'), message: error.message, path } }; }
async function requireUser(req) { return currentUser({ repository, token: bearerToken(req) }); }
const server = http.createServer(async (req, res) => {
  const { method, path, search } = route(req);
  try {
    if (method === 'GET' && (path === '/healthz' || path === '/api/v1/health')) return sendJson(res, 200, { ok: true, service: 'allegro-vibez-api', mode: 'foundation', persistence: persistenceConfigured ? 'SUPABASE' : 'NOT_CONFIGURED' });
    if (method === 'POST' && path === '/api/v1/auth/register') return sendJson(res, 201, { data: await register({ repository, body: await jsonBody(req) }) });
    if (method === 'POST' && path === '/api/v1/auth/login') return sendJson(res, 200, { data: await login({ repository, body: await jsonBody(req) }) });
    if (method === 'GET' && path === '/api/v1/me') return sendJson(res, 200, { data: await requireUser(req) });
    if (method === 'POST' && path === '/api/v1/artists') { const user = await requireUser(req); return sendJson(res, 201, { data: await createArtist({ repository, userId: user.id, body: await jsonBody(req) }) }); }
    if (method === 'GET' && path === '/api/v1/artists') return sendJson(res, 200, { data: await listArtists({ repository }) });
    if (method === 'GET' && /^\/api\/v1\/artists\/[^/]+$/.test(path)) return sendJson(res, 200, { data: await getArtist({ repository, artistId: path.split('/').pop() }) });
    if (method === 'PATCH' && /^\/api\/v1\/artists\/[^/]+$/.test(path)) { const user = await requireUser(req); return sendJson(res, 200, { data: await updateArtist({ repository, userId: user.id, artistId: path.split('/').pop(), body: await jsonBody(req) }) }); }
    if (method === 'POST' && path === '/api/v1/releases') { const user = await requireUser(req); const body = await jsonBody(req); return sendJson(res, 201, { data: await createRelease({ repository, userId: user.id, artistId: id(body.artistId, 'artistId'), body }) }); }
    if (method === 'GET' && /^\/api\/v1\/releases\/[^/]+$/.test(path)) return sendJson(res, 200, { data: await getRelease({ repository, releaseId: path.split('/').pop() }) });
    if (method === 'POST' && /^\/api\/v1\/releases\/[^/]+\/submit$/.test(path)) { const user = await requireUser(req); return sendJson(res, 200, { data: await submitRelease({ repository, userId: user.id, releaseId: path.split('/')[4] }) }); }
    if (method === 'PUT' && /^\/api\/v1\/releases\/[^/]+\/splits$/.test(path)) { const user = await requireUser(req); const body = await jsonBody(req); return sendJson(res, 200, { data: await setRightsSplits({ repository, userId: user.id, releaseId: path.split('/')[4], splits: body.splits }) }); }
    if (method === 'GET' && /^\/api\/v1\/releases\/[^/]+\/splits$/.test(path)) return sendJson(res, 200, { data: await getRightsSplits({ repository, releaseId: path.split('/')[4] }) });
    if (method === 'GET' && path === '/api/v1/earnings') { const user = await requireUser(req); return sendJson(res, 200, { data: await getEarnings({ repository, userId: user.id, currency: search.get('currency') ?? 'ZAR' }) }); }
    if (method === 'POST' && path === '/api/v1/earnings/payouts') { const user = await requireUser(req); return sendJson(res, 201, { data: await requestPayout({ repository, userId: user.id, body: await jsonBody(req) }) }); }
    if (method === 'POST' && path === '/api/v1/orders') { const user = await requireUser(req); return sendJson(res, 201, { data: await createOrder({ repository, userId: user.id, body: await jsonBody(req), requestId: req.headers['x-request-id'] ?? null }) }); }
    if (method === 'GET' && /^\/api\/v1\/orders\/[^/]+$/.test(path)) { const user = await requireUser(req); return sendJson(res, 200, { data: await getOrder({ repository, userId: user.id, orderId: path.split('/').pop() }) }); }
    if (method === 'POST' && /^\/api\/v1\/payments\/[^/]+\/verify$/.test(path)) { const body = await jsonBody(req); return sendJson(res, 200, { data: await verifyPayment({ repository, paymentId: path.split('/')[4], providerReference: body.providerReference, verified: body.verified, requestId: req.headers['x-request-id'] ?? null, reconciliationSecret: req.headers['x-allegro-reconciliation-secret'] ?? null }) }); }
    if (method === 'POST' && path === '/api/v1/media/upload-intents') { const user = await requireUser(req); return sendJson(res, 201, { data: await createUploadIntent({ repository, userId: user.id, body: await jsonBody(req) }) }); }
    if (method === 'GET' && /^\/api\/v1\/media\/[^/]+$/.test(path)) { const user = await requireUser(req); return sendJson(res, 200, { data: await getAsset({ repository, userId: user.id, assetId: path.split('/').pop() }) }); }
    if (path.startsWith('/api/v1/')) return sendJson(res, 501, { error: { code: 'NOT_CONFIGURED', message: 'Production service adapter is not configured yet.', path, method, adapters: Object.fromEntries(Object.entries(adapters).map(([name, adapter]) => [name, adapter.status])) } });
    return sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Route not found.' } });
  } catch (error) { return sendJson(res, statusFor(error), errorBody(error, path)); }
});
server.listen(port, '0.0.0.0', () => console.log(`ALLEGRO-VIBEZ API foundation listening on :${port}`));
