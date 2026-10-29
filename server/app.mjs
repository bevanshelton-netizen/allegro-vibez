import http from 'node:http';
import crypto from 'node:crypto';
import { createAdapterRegistry } from './adapters/index.mjs';
import { createRepository, RepositoryNotConfiguredError } from './domain/repository.mjs';
import { jsonBody, id } from './domain/validation.mjs';
import { register, login, currentUser, logout } from './services/identity.mjs';
import { createArtist, listArtists, getArtist, updateArtist } from './services/artists.mjs';
import { createRelease, getRelease, submitRelease } from './services/releases.mjs';
import { setRightsSplits, getRightsSplits } from './services/rights.mjs';
import { getEarnings, requestPayout } from './services/earnings.mjs';
import { createOrder, getOrder, verifyPayment } from './services/payments.mjs';
import { createSignedUpload, completeUpload, getAsset, getPlaybackUrl, getPublicReleasePlaybackUrl } from './services/media.mjs';
import { approveRelease, publishRelease } from './services/publication.mjs';
import { createCommunityPost, listCommunityFeed, deleteCommunityPost } from './services/community.mjs';
import { followUser, unfollowUser, listFollowing, listFollowers, createConversation, listConversations, listMessages, sendMessage, deleteMessage } from './services/social.mjs';

const port = Number(process.env.PORT || 8787);
const adapters = createAdapterRegistry();
const persistenceConfigured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const repository = persistenceConfigured ? createSupabaseRepository() : createRepository();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 120;
const requestCounts = new Map();
function requestId(req) { return String(req.headers['x-request-id'] || crypto.randomUUID()).slice(0, 128); }
function clientKey(req) { if (process.env.ALLEGRO_TRUST_PROXY === 'true') return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim(); return String(req.socket.remoteAddress || 'unknown'); }
function rateLimited(req) { const now = Date.now(); const key = `${clientKey(req)}:${Math.floor(now / WINDOW_MS)}`; const count = (requestCounts.get(key) || 0) + 1; requestCounts.set(key, count); if (requestCounts.size > 5000) for (const [entry] of requestCounts) if (!entry.endsWith(`:${Math.floor(now / WINDOW_MS)}`)) requestCounts.delete(entry); return count > MAX_REQUESTS; }
function securityHeaders() { return { 'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY', 'referrer-policy': 'no-referrer', 'permissions-policy': 'camera=(), microphone=(), geolocation=()', 'content-security-policy': "default-src 'none'; frame-ancestors 'none'" }; }
function sendJson(res, status, body, extraHeaders = {}) { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...securityHeaders(), ...extraHeaders }); res.end(JSON.stringify(body)); }
function sendNoContent(res, extraHeaders = {}) { res.writeHead(204, { 'cache-control': 'no-store', ...securityHeaders(), ...extraHeaders }); res.end(); }
function route(req) { const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`); return { method: req.method ?? 'GET', path: url.pathname, search: url.searchParams }; }
function bearerToken(req) { const header = req.headers.authorization ?? ''; return header.startsWith('Bearer ') ? header.slice(7).trim() : null; }
function statusFor(error) { if (error instanceof RepositoryNotConfiguredError || error.code === 'NOT_CONFIGURED') return 501; if (error.code === 'INVALID_REQUEST' || error.code === 'INVALID_JSON') return 400; if (error.code === 'PAYLOAD_TOO_LARGE') return 413; if (error.code === 'UNAUTHORIZED') return 401; if (error.code === 'FORBIDDEN') return 403; if (error.code === 'NOT_FOUND') return 404; if (error.code === 'CONFLICT') return 409; if (error.code === 'RATE_LIMITED') return 429; return 500; }
function errorBody(error, path, rid) { const status = statusFor(error); return { error: { code: error.code ?? (status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'), message: error.message, path, requestId: rid } }; }
async function requireUser(req) { return currentUser({ repository, token: bearerToken(req) }); }

const server = http.createServer(async (req, res) => {
  const rid = requestId(req); res.setHeader('x-request-id', rid);
  if (rateLimited(req)) return sendJson(res, 429, { error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again shortly.', requestId: rid } }, { 'retry-after': '60' });
  const { method, path, search } = route(req);
  try {
    if (method === 'OPTIONS') return sendNoContent(res, { 'access-control-allow-origin': process.env.ALLEGRO_ALLOWED_ORIGIN || 'null', 'access-control-allow-methods': 'GET,POST,DELETE,PUT,PATCH,OPTIONS', 'access-control-allow-headers': 'Authorization,Content-Type,Idempotency-Key,X-Request-Id,X-Allegro-Release-Approval-Secret,X-Allegro-Reconciliation-Secret', 'vary': 'Origin' });
    const allowedOrigin = process.env.ALLEGRO_ALLOWED_ORIGIN;
    if (allowedOrigin && req.headers.origin === allowedOrigin) { res.setHeader('access-control-allow-origin', allowedOrigin); res.setHeader('vary', 'Origin'); }
    if (method === 'GET' && (path === '/healthz' || path === '/api/v1/health')) return sendJson(res, 200, { ok: true, service: 'allegro-vibez-api', mode: 'foundation', persistence: persistenceConfigured ? 'SUPABASE' : 'NOT_CONFIGURED' });
    if (method === 'POST' && path === '/api/v1/auth/register') return sendJson(res, 201, { data: await register({ repository, body: await jsonBody(req) }) });
    if (method === 'POST' && path === '/api/v1/auth/login') return sendJson(res, 200, { data: await login({ repository, body: await jsonBody(req) }) });
    if (method === 'POST' && path === '/api/v1/auth/logout') return sendJson(res, 200, { data: await logout({ repository, token: bearerToken(req) }) });
    if (method === 'GET' && path === '/api/v1/me') return sendJson(res, 200, { data: await requireUser(req) });
    if (method === 'POST' && path === '/api/v1/artists') { const user = await requireUser(req); return sendJson(res, 201, { data: await createArtist({ repository, userId: user.id, body: await jsonBody(req) }) }); }
    if (method === 'GET' && path === '/api/v1/artists') return sendJson(res, 200, { data: await listArtists({ repository }) });
    if (method === 'GET' && /^\/api\/v1\/artists\/[^/]+$/.test(path)) return sendJson(res, 200, { data: await getArtist({ repository, artistId: path.split('/').pop() }) });
    if (method === 'PATCH' && /^\/api\/v1\/artists\/[^/]+$/.test(path)) { const user = await requireUser(req); return sendJson(res, 200, { data: await updateArtist({ repository, userId: user.id, artistId: path.split('/').pop(), body: await jsonBody(req) }) }); }
    if (method === 'POST' && path === '/api/v1/releases') { const user = await requireUser(req); const body = await jsonBody(req); return sendJson(res, 201, { data: await createRelease({ repository, userId: user.id, artistId: id(body.artistId, 'artistId'), body }) }); }
    if (method === 'GET' && /^\/api\/v1\/releases\/[^/]+$/.test(path)) return sendJson(res, 200, { data: await getRelease({ repository, releaseId: path.split('/').pop() }) });
    if (method === 'GET' && /^\/api\/v1\/releases\/[^/]+\/playback$/.test(path)) return sendJson(res, 200, { data: await getPublicReleasePlaybackUrl({ repository, releaseId: path.split('/')[4], trackId: search.get('trackId') ?? null, expiresIn: Number(search.get('expiresIn') ?? 900) }) });
    if (method === 'POST' && /^\/api\/v1\/releases\/[^/]+\/submit$/.test(path)) { const user = await requireUser(req); return sendJson(res, 200, { data: await submitRelease({ repository, userId: user.id, releaseId: path.split('/')[4] }) }); }
    if (method === 'POST' && /^\/api\/v1\/releases\/[^/]+\/approve$/.test(path)) return sendJson(res, 200, { data: await approveRelease({ repository, releaseId: path.split('/')[4], approvalSecretValue: req.headers['x-allegro-release-approval-secret'] ?? null, requestId: rid }) });
    if (method === 'POST' && /^\/api\/v1\/releases\/[^/]+\/publish$/.test(path)) { const user = await requireUser(req); return sendJson(res, 200, { data: await publishRelease({ repository, userId: user.id, releaseId: path.split('/')[4], requestId: rid }) }); }
    if (method === 'PUT' && /^\/api\/v1\/releases\/[^/]+\/splits$/.test(path)) { const user = await requireUser(req); const body = await jsonBody(req); return sendJson(res, 200, { data: await setRightsSplits({ repository, userId: user.id, releaseId: path.split('/')[4], splits: body.splits }) }); }
    if (method === 'GET' && /^\/api\/v1\/releases\/[^/]+\/splits$/.test(path)) return sendJson(res, 200, { data: await getRightsSplits({ repository, releaseId: path.split('/')[4] }) });
    if (method === 'GET' && path === '/api/v1/earnings') { const user = await requireUser(req); return sendJson(res, 200, { data: await getEarnings({ repository, userId: user.id, currency: search.get('currency') ?? 'ZAR' }) }); }
    if (method === 'POST' && path === '/api/v1/earnings/payouts') { const user = await requireUser(req); return sendJson(res, 201, { data: await requestPayout({ repository, userId: user.id, body: await jsonBody(req), idempotencyKey: req.headers['idempotency-key'] ?? null, requestId: rid }) }); }
    if (method === 'POST' && path === '/api/v1/orders') { const user = await requireUser(req); return sendJson(res, 201, { data: await createOrder({ repository, userId: user.id, body: await jsonBody(req), requestId: rid }) }); }
    if (method === 'GET' && /^\/api\/v1\/orders\/[^/]+$/.test(path)) { const user = await requireUser(req); return sendJson(res, 200, { data: await getOrder({ repository, userId: user.id, orderId: path.split('/').pop() }) }); }
    if (method === 'POST' && /^\/api\/v1\/payments\/[^/]+\/verify$/.test(path)) { const body = await jsonBody(req); return sendJson(res, 200, { data: await verifyPayment({ repository, paymentId: path.split('/')[4], providerReference: body.providerReference, verified: body.verified, amountMinor: body.amountMinor, currency: body.currency, requestId: rid, reconciliationSecret: req.headers['x-allegro-reconciliation-secret'] ?? null }) }); }
    if (method === 'GET' && path === '/api/v1/community/feed') return sendJson(res, 200, { data: await listCommunityFeed({ repository, limit: Number(search.get('limit') ?? 50) }) });
    if (method === 'POST' && path === '/api/v1/community/posts') { const user = await requireUser(req); return sendJson(res, 201, { data: await createCommunityPost({ repository, userId: user.id, body: await jsonBody(req) }) }); }
    if (method === 'DELETE' && /^\/api\/v1\/community\/posts\/[^/]+$/.test(path)) { const user = await requireUser(req); return sendJson(res, 200, { data: await deleteCommunityPost({ repository, userId: user.id, postId: path.split('/').pop() }) }); }
    if (method === 'POST' && /^\/api\/v1\/users\/[^/]+\/follow$/.test(path)) { const user = await requireUser(req); return sendJson(res, 201, { data: await followUser({ repository, userId: user.id, targetUserId: path.split('/')[4] }) }); }
    if (method === 'DELETE' && /^\/api\/v1\/users\/[^/]+\/follow$/.test(path)) { const user = await requireUser(req); return sendJson(res, 200, { data: await unfollowUser({ repository, userId: user.id, targetUserId: path.split('/')[4] }) }); }
    if (method === 'GET' && path === '/api/v1/social/following') { const user = await requireUser(req); return sendJson(res, 200, { data: await listFollowing({ repository, userId: user.id, limit: Number(search.get('limit') ?? 100) }) }); }
    if (method === 'GET' && path === '/api/v1/social/followers') { const user = await requireUser(req); return sendJson(res, 200, { data: await listFollowers({ repository, userId: user.id, limit: Number(search.get('limit') ?? 100) }) }); }
    if (method === 'POST' && path === '/api/v1/conversations') { const user = await requireUser(req); const body = await jsonBody(req); return sendJson(res, 201, { data: await createConversation({ repository, userId: user.id, otherUserId: body.otherUserId }) }); }
    if (method === 'GET' && path === '/api/v1/conversations') { const user = await requireUser(req); return sendJson(res, 200, { data: await listConversations({ repository, userId: user.id, limit: Number(search.get('limit') ?? 50) }) }); }
    if (method === 'GET' && /^\/api\/v1\/conversations\/[^/]+\/messages$/.test(path)) { const user = await requireUser(req); return sendJson(res, 200, { data: await listMessages({ repository, userId: user.id, conversationId: path.split('/')[4], limit: Number(search.get('limit') ?? 100) }) }); }
    if (method === 'POST' && /^\/api\/v1\/conversations\/[^/]+\/messages$/.test(path)) { const user = await requireUser(req); return sendJson(res, 201, { data: await sendMessage({ repository, userId: user.id, conversationId: path.split('/')[4], body: await jsonBody(req) }) }); }
    if (method === 'DELETE' && /^\/api\/v1\/messages\/[^/]+$/.test(path)) { const user = await requireUser(req); return sendJson(res, 200, { data: await deleteMessage({ repository, userId: user.id, messageId: path.split('/').pop() }) }); }
    if (method === 'POST' && path === '/api/v1/media/upload-intents') { const user = await requireUser(req); return sendJson(res, 201, { data: await createSignedUpload({ repository, userId: user.id, body: await jsonBody(req) }) }); }
    if (method === 'POST' && /^\/api\/v1\/media\/[^/]+\/complete$/.test(path)) { const user = await requireUser(req); return sendJson(res, 200, { data: await completeUpload({ repository, userId: user.id, assetId: path.split('/')[4] }) }); }
    if (method === 'GET' && /^\/api\/v1\/media\/[^/]+\/play$/.test(path)) { const user = await requireUser(req); return sendJson(res, 200, { data: await getPlaybackUrl({ repository, userId: user.id, assetId: path.split('/')[4], expiresIn: Number(search.get('expiresIn') ?? 900) }) }); }
    if (method === 'GET' && /^\/api\/v1\/media\/[^/]+$/.test(path)) { const user = await requireUser(req); return sendJson(res, 200, { data: await getAsset({ repository, userId: user.id, assetId: path.split('/').pop() }) }); }
    if (path.startsWith('/api/v1/')) return sendJson(res, 501, { error: { code: 'NOT_CONFIGURED', message: 'Production service adapter is not configured yet.', path, method, adapters: Object.fromEntries(Object.entries(adapters).map(([name, adapter]) => [name, adapter.status])), requestId: rid } });
    return sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Route not found.', requestId: rid } });
  } catch (error) { return sendJson(res, statusFor(error), errorBody(error, path, rid)); }
});
server.listen(port, '0.0.0.0', () => console.log(`ALLEGRO-VIBEZ API foundation listening on :${port}`));
