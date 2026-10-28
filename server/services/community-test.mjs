import assert from 'node:assert/strict';
import test from 'node:test';
import { createCommunityPost, listCommunityFeed, deleteCommunityPost } from './community.mjs';

function repo(seed = []) {
  const data = new Map(seed.map((row) => [`${row.collection}:${row.id}`, row]));
  return {
    create: async (collection, value) => { const row = { collection, ...value }; data.set(`${collection}:${row.id}`, row); return row; },
    get: async (collection, where) => data.get(`${collection}:${where.id}`) ?? null,
    list: async (collection, where = {}) => [...data.values()].filter((row) => row.collection === collection && Object.entries(where).every(([key, value]) => row[key] === value)),
    delete: async (collection, where) => data.delete(`${collection}:${where.id}`)
  };
}

test('community post requires authenticated author and validates body length', async () => {
  const repository = repo();
  const post = await createCommunityPost({ repository, userId: 'user-1', body: { body: 'Hello ALLEGRO-VIBEZ' } });
  assert.equal(post.authorId, 'user-1');
  assert.equal(post.status, 'PUBLISHED');
  await assert.rejects(() => createCommunityPost({ repository, userId: 'user-1', body: { body: 'x'.repeat(4001) } }), (error) => error.code === 'INVALID_REQUEST');
});

test('community feed returns published posts newest first', async () => {
  const repository = repo([
    { collection: 'community_posts', id: 'old', authorId: 'u1', body: 'old', status: 'PUBLISHED', createdAt: '2026-01-01T00:00:00Z' },
    { collection: 'community_posts', id: 'hidden', authorId: 'u2', body: 'hidden', status: 'HIDDEN', createdAt: '2026-03-01T00:00:00Z' },
    { collection: 'community_posts', id: 'new', authorId: 'u3', body: 'new', status: 'PUBLISHED', createdAt: '2026-04-01T00:00:00Z' }
  ]);
  const feed = await listCommunityFeed({ repository });
  assert.deepEqual(feed.map((post) => post.id), ['new', 'old']);
});

test('community post deletion requires ownership', async () => {
  const repository = repo([{ collection: 'community_posts', id: 'post-1', authorId: 'owner', body: 'hello', status: 'PUBLISHED' }]);
  await assert.rejects(() => deleteCommunityPost({ repository, userId: 'other', postId: 'post-1' }), (error) => error.code === 'UNAUTHORIZED');
  const result = await deleteCommunityPost({ repository, userId: 'owner', postId: 'post-1' });
  assert.equal(result.ok, true);
});
