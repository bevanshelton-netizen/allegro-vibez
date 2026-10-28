import test from 'node:test';
import assert from 'node:assert/strict';
import { createUploadIntent, completeUpload, getPlaybackUrl, getPublicReleasePlaybackUrl } from './media.mjs';

function repo(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    create: async (collection, value) => {
      const row = { collection, ...value };
      data.set(`${collection}:${value.id}`, row);
      return row;
    },
    get: async (collection, where) => data.get(`${collection}:${where.id}`) ?? null,
    update: async (collection, where, patch) => {
      const key = `${collection}:${where.id}`;
      const row = { ...(data.get(key) ?? {}), ...patch };
      data.set(key, row);
      return row;
    },
    list: async (collection, where) => [...data.values()].filter((row) => row.collection === collection && Object.entries(where).every(([key, value]) => row[key] === value))
  };
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

test('media completion requires the uploaded object to match the intent', async () => {
  const asset = {
    collection: 'audio_assets',
    id: 'asset-1',
    ownerId: 'user-1',
    filename: 'track.mp3',
    contentType: 'audio/mpeg',
    sizeBytes: 1024,
    objectKey: 'audio/user-1/asset-1/track.mp3',
    status: 'PENDING_UPLOAD'
  };
  const repository = repo({ 'audio_assets:asset-1': asset });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify([{ name: 'track.mp3', metadata: { size: '1024', mimetype: 'audio/mpeg' } }]), { status: 200, headers: { 'content-type': 'application/json' } });
  try {
    const completed = await completeUpload({ repository, userId: 'user-1', assetId: 'asset-1' });
    assert.equal(completed.status, 'READY');
    assert.ok(completed.completedAt);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('media completion rejects an object with the wrong size', async () => {
  const asset = {
    collection: 'audio_assets', id: 'asset-2', ownerId: 'user-1', filename: 'track.mp3',
    contentType: 'audio/mpeg', sizeBytes: 1024, objectKey: 'audio/user-1/asset-2/track.mp3', status: 'PENDING_UPLOAD'
  };
  const repository = repo({ 'audio_assets:asset-2': asset });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify([{ name: 'track.mp3', metadata: { size: '2048', mimetype: 'audio/mpeg' } }]), { status: 200, headers: { 'content-type': 'application/json' } });
  try {
    await assert.rejects(() => completeUpload({ repository, userId: 'user-1', assetId: 'asset-2' }), /size does not match/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('playback signing only permits READY assets', async () => {
  const pending = { collection: 'audio_assets', id: 'asset-3', ownerId: 'user-1', status: 'PENDING_UPLOAD', objectKey: 'audio/user-1/asset-3/track.mp3' };
  const repository = repo({ 'audio_assets:asset-3': pending });
  await assert.rejects(() => getPlaybackUrl({ repository, userId: 'user-1', assetId: 'asset-3' }), /not ready for playback/);
});

test('public playback only exposes published releases with READY audio', async () => {
  const release = { collection: 'releases', id: 'release-1', status: 'PUBLISHED' };
  const track = { collection: 'tracks', id: 'track-1', releaseId: 'release-1', audioAssetId: 'asset-4' };
  const asset = { collection: 'audio_assets', id: 'asset-4', ownerId: 'user-1', status: 'READY', objectKey: 'audio/user-1/asset-4/track.mp3' };
  const repository = repo({
    'releases:release-1': release,
    'tracks:track-1': track,
    'audio_assets:asset-4': asset
  });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ signedURL: 'https://storage.example/signed' }), { status: 200, headers: { 'content-type': 'application/json' } });
  try {
    const playback = await getPublicReleasePlaybackUrl({ repository, releaseId: 'release-1', trackId: 'track-1' });
    assert.equal(playback.releaseId, 'release-1');
    assert.equal(playback.trackId, 'track-1');
    assert.equal(playback.signedUrl, 'https://storage.example/signed');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
