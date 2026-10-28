import crypto from 'node:crypto';
import { assertObject, id, requiredString } from '../domain/validation.mjs';

const MAX_BODY = 4000;

function error(message, code = 'INVALID_REQUEST') {
  const e = new Error(message);
  e.code = code;
  return e;
}

export async function createCommunityPost({ repository, userId, body }) {
  id(userId, 'userId');
  assertObject(body);
  const text = requiredString(body.body, 'body', { min: 1, max: MAX_BODY });
  const now = new Date().toISOString();
  return repository.create('community_posts', {
    id: crypto.randomUUID(),
    authorId: userId,
    body: text,
    status: 'PUBLISHED',
    createdAt: now,
    updatedAt: now
  });
}

export async function listCommunityFeed({ repository, limit = 50 }) {
  const rows = await repository.list('community_posts', { status: 'PUBLISHED' });
  return rows
    .filter((post) => typeof post.body === 'string')
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, Math.max(1, Math.min(Number(limit) || 50, 100)))
    .map(({ body, ...post }) => ({ ...post, body }));
}

export async function deleteCommunityPost({ repository, userId, postId }) {
  const post = await repository.get('community_posts', { id: id(postId, 'postId') });
  if (!post) throw error('Community post not found', 'NOT_FOUND');
  if (post.authorId !== userId) throw error('You do not own this community post', 'UNAUTHORIZED');
  await repository.delete('community_posts', { id: post.id });
  return { ok: true, id: post.id };
}
