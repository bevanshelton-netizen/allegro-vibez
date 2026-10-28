import test from 'node:test';
import assert from 'node:assert/strict';
import { createUploadIntent } from './media.mjs';

function repo() {
  return { create: async (collection, value) => ({ collection, ...value }) };
}

test('media upload intent accepts supported audio within size limit', async () => {
  const asset = await createUploadIntent({ repository: repo(), userId: 'user-1', body: {
    filename: 'track.mp3', contentType: 'audio/mpeg', sizeBytes: 1024
  }});
  assert.equal(asset.status, 'PENDING_UPLOAD');
  assert.equal(asset.ownerId, 'user-1');
  assert.match(asset.objectKey, /^audio\/user-1\//);
});

test('media upload intent rejects unsupported content type', async () => {
  await assert.rejects(() => createUploadIntent({ repository: repo(), userId: 'user-1', body: {
    filename: 'track.exe', contentType: 'application/octet-stream', sizeBytes: 1024
  }}), /Unsupported audio/);
});

test('media upload intent rejects oversized audio', async () => {
  await assert.rejects(() => createUploadIntent({ repository: repo(), userId: 'user-1', body: {
    filename: 'track.wav', contentType: 'audio/wav', sizeBytes: 250 * 1024 * 1024 + 1
  }}), /outside the permitted range/);
});
