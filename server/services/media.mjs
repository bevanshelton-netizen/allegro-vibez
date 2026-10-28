import crypto from 'node:crypto';
import { assertObject, requiredString } from '../domain/validation.mjs';

const ALLOWED_AUDIO = new Set(['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/ogg']);
const MAX_AUDIO_BYTES = 250 * 1024 * 1024;

function error(message, code = 'INVALID_REQUEST') {
  const e = new Error(message);
  e.code = code;
  return e;
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

export async function getAsset({ repository, userId, assetId }) {
  if (!userId) throw error('Authentication required', 'UNAUTHORIZED');
  const asset = await repository.get('audio_assets', { id: assetId });
  if (!asset) throw error('Media asset not found', 'NOT_FOUND');
  if (asset.ownerId !== userId) throw error('Media asset access denied', 'FORBIDDEN');
  return asset;
}

export { ALLOWED_AUDIO, MAX_AUDIO_BYTES };
