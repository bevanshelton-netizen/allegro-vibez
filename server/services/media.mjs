import crypto from 'node:crypto';
import { assertObject, requiredString } from '../domain/validation.mjs';

const ALLOWED_AUDIO = new Set(['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/ogg']);
const MAX_AUDIO_BYTES = 250 * 1024 * 1024;
const BUCKET = 'allegro-vibez-audio';
const SIGNED_UPLOAD_SECONDS = 7200;

function error(message, code = 'INVALID_REQUEST') {
  const e = new Error(message);
  e.code = code;
  return e;
}

function storageConfig() {
  const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serviceKey) throw error('Supabase media storage requires server-only SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY', 'NOT_CONFIGURED');
  return { baseUrl, serviceKey };
}

async function storageRequest(path, options = {}) {
  const { baseUrl, serviceKey } = storageConfig();
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Accept: 'application/json', ...(options.headers ?? {}) };
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = null; }
  if (!response.ok) {
    const e = error(payload?.message || payload?.error || `Supabase Storage request failed (${response.status})`, 'MEDIA_STORAGE_ERROR');
    e.status = response.status;
    throw e;
  }
  return payload;
}

function encodeObjectPath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

export function createUploadIntent({ repository, userId, body }) {
  assertObject(body);
  if (!userId) throw error('Authentication required', 'UNAUTHORIZED');
  const filename = requiredString(body.filename, 'filename', { max: 255 });
  const contentType = requiredString(body.contentType, 'contentType', { max: 100 }).toLowerCase();
  const sizeBytes = Number(body.sizeBytes);
  if (!ALLOWED_AUDIO.has(contentType)) throw error('Unsupported audio content type');
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_AUDIO_BYTES) throw error('sizeBytes is outside the permitted range');
  const assetId = crypto.randomUUID();
  const objectKey = `audio/${userId}/${assetId}/${filename.replace(/[^A-Za-z0-9._-]/g, '_')}`;
  return repository.create('audio_assets', {
    id: assetId,
    ownerId: userId,
    filename,
    contentType,
    sizeBytes,
    objectKey,
    status: 'PENDING_UPLOAD',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

export async function createSignedUpload({ repository, userId, body }) {
  const asset = await createUploadIntent({ repository, userId, body });
  try {
    const payload = await storageRequest(`/storage/v1/object/upload/sign/${BUCKET}/${encodeObjectPath(asset.objectKey)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ expiresIn: SIGNED_UPLOAD_SECONDS, upsert: false })
    });
    return { asset, upload: payload?.url ? { signedUrl: payload.url, expiresIn: SIGNED_UPLOAD_SECONDS } : payload?.data ? { ...payload.data, expiresIn: SIGNED_UPLOAD_SECONDS } : payload };
  } catch (e) {
    await repository.delete('audio_assets', { id: asset.id });
    throw e;
  }
}

async function listObject(objectKey) {
  const slash = objectKey.lastIndexOf('/');
  const prefix = slash === -1 ? '' : objectKey.slice(0, slash);
  const filename = objectKey.slice(slash + 1);
  const payload = await storageRequest(`/storage/v1/object/list/${BUCKET}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prefix, search: filename, limit: 10, offset: 0 })
  });
  return (Array.isArray(payload) ? payload : payload?.data ?? []).find((item) => item.name === filename) ?? null;
}

export async function completeUpload({ repository, userId, assetId }) {
  const asset = await getAsset({ repository, userId, assetId });
  if (asset.status !== 'PENDING_UPLOAD') throw error('Media asset is not awaiting upload', 'CONFLICT');
  const object = await listObject(asset.objectKey);
  if (!object) throw error('Uploaded media object was not found', 'NOT_FOUND');
  const actualSize = Number(object.metadata?.size ?? object.size ?? 0);
  const actualType = String(object.metadata?.mimetype ?? object.metadata?.contentType ?? object.contentType ?? '').toLowerCase();
  if (actualSize !== asset.sizeBytes) throw error('Uploaded media size does not match the upload intent', 'CONFLICT');
  if (actualType && actualType !== asset.contentType) throw error('Uploaded media content type does not match the upload intent', 'CONFLICT');
  return repository.update('audio_assets', { id: asset.id }, {
    status: 'READY',
    updatedAt: new Date().toISOString(),
    completedAt: new Date().toISOString()
  });
}

export async function getPlaybackUrl({ repository, userId, assetId, expiresIn = 900 }) {
  const asset = await getAsset({ repository, userId, assetId });
  if (asset.status !== 'READY') throw error('Media asset is not ready for playback', 'CONFLICT');
  const seconds = Number(expiresIn);
  if (!Number.isInteger(seconds) || seconds < 60 || seconds > 3600) throw error('expiresIn must be between 60 and 3600 seconds');
  const payload = await storageRequest(`/storage/v1/object/sign/${BUCKET}/${encodeObjectPath(asset.objectKey)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ expiresIn: seconds })
  });
  return { asset, signedUrl: payload?.signedURL ?? payload?.signedUrl ?? payload?.url ?? payload?.data?.signedUrl, expiresIn: seconds };
}

export async function getAsset({ repository, userId, assetId }) {
  if (!userId) throw error('Authentication required', 'UNAUTHORIZED');
  const asset = await repository.get('audio_assets', { id: assetId });
  if (!asset) throw error('Media asset not found', 'NOT_FOUND');
  if (asset.ownerId !== userId) throw error('Media asset access denied', 'FORBIDDEN');
  return asset;
}

export { ALLOWED_AUDIO, MAX_AUDIO_BYTES, BUCKET };
