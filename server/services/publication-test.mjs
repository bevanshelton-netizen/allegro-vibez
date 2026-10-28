import assert from 'node:assert/strict';
import test from 'node:test';
import { approveRelease, publishRelease } from './publication.mjs';

function repo(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    create: async (collection, value) => {
      const row = { collection, ...value };
      data.set(`${collection}:${value.id}`, row);
      return row;
    },
    get: async (collection, where) => data.get(`${collection}:${where.id}`) ?? null,
    list: async (collection, where = {}) => [...data.values()].filter((row) => row.collection === collection && Object.entries(where).every(([key, value]) => row[key] === value)),
    update: async (collection, where, patch) => {
      const key = `${collection}:${where.id}`;
      const current = data.get(key);
      if (!current) return null;
      const row = { ...current, ...patch };
      data.set(key, row);
      return row;
    }
  };
}

function releaseFixture(overrides = {}) {
  return {
    collection: 'releases', id: 'release-1', artistId: 'artist-1', status: 'APPROVED', ...overrides
  };
}

function publishableRepo(overrides = {}) {
  return repo({
    'releases:release-1': releaseFixture(),
    'artists:artist-1': { collection: 'artists', id: 'artist-1', userId: 'user-1' },
    'rights_splits:split-1': { collection: 'rights_splits', id: 'split-1', releaseId: 'release-1', sharePercent: 100 },
    'tracks:track-1': { collection: 'tracks', id: 'track-1', releaseId: 'release-1', audioAssetId: 'asset-1' },
    'audio_assets:asset-1': { collection: 'audio_assets', id: 'asset-1', ownerId: 'user-1', status: 'READY' },
    ...overrides
  });
}

test('approval requires the configured release approval secret', async () => {
  const previous = process.env.ALLEGRO_RELEASE_APPROVAL_SECRET;
  process.env.ALLEGRO_RELEASE_APPROVAL_SECRET = 'approval-secret';
  try {
    const repository = repo({ 'releases:release-1': releaseFixture({ status: 'SUBMITTED' }) });
    await assert.rejects(() => approveRelease({ repository, releaseId: 'release-1', approvalSecretValue: 'wrong' }), (error) => error.code === 'FORBIDDEN');
    const approved = await approveRelease({ repository, releaseId: 'release-1', approvalSecretValue: 'approval-secret', requestId: 'req-1' });
    assert.equal(approved.status, 'APPROVED');
    assert.equal((await repository.list('audit_events')).length, 1);
  } finally {
    if (previous === undefined) delete process.env.ALLEGRO_RELEASE_APPROVAL_SECRET;
    else process.env.ALLEGRO_RELEASE_APPROVAL_SECRET = previous;
  }
});

test('publication requires complete rights and READY audio', async () => {
  const noRights = publishableRepo({ 'rights_splits:split-1': { collection: 'rights_splits', id: 'split-1', releaseId: 'release-1', sharePercent: 99 } });
  await assert.rejects(() => publishRelease({ repository: noRights, userId: 'user-1', releaseId: 'release-1' }), (error) => error.code === 'CONFLICT');

  const noAudio = publishableRepo({ 'audio_assets:asset-1': { collection: 'audio_assets', id: 'asset-1', ownerId: 'user-1', status: 'PENDING_UPLOAD' } });
  await assert.rejects(() => publishRelease({ repository: noAudio, userId: 'user-1', releaseId: 'release-1' }), (error) => error.code === 'CONFLICT');
});

test('only the owning artist can publish an approved release', async () => {
  const repository = publishableRepo();
  await assert.rejects(() => publishRelease({ repository, userId: 'different-user', releaseId: 'release-1' }), (error) => error.code === 'UNAUTHORIZED');
});

test('valid approved release reaches PUBLISHED and creates an audit event', async () => {
  const repository = publishableRepo();
  const published = await publishRelease({ repository, userId: 'user-1', releaseId: 'release-1', requestId: 'req-publish-1' });
  assert.equal(published.status, 'PUBLISHED');
  assert.ok(published.publishedAt);
  const audits = await repository.list('audit_events');
  assert.equal(audits.length, 1);
  assert.equal(audits[0].action, 'PUBLISH_RELEASE');
});

test('published releases cannot be published again', async () => {
  const repository = publishableRepo();
  await publishRelease({ repository, userId: 'user-1', releaseId: 'release-1' });
  await assert.rejects(() => publishRelease({ repository, userId: 'user-1', releaseId: 'release-1' }), (error) => error.code === 'CONFLICT');
});
