import test from 'node:test';
import assert from 'node:assert/strict';
import { createRepository } from '../domain/repository.mjs';
import { followUser, unfollowUser, createConversation, sendMessage, listMessages, deleteMessage } from './social.mjs';

test('social graph prevents self-follow and supports follow/unfollow', async () => {
  const repository = createRepository();
  await repository.create('users', { id: 'user-a', email: 'a@example.com' });
  await repository.create('users', { id: 'user-b', email: 'b@example.com' });
  await assert.rejects(() => followUser({ repository, userId: 'user-a', targetUserId: 'user-a' }), { code: 'INVALID_REQUEST' });
  const followed = await followUser({ repository, userId: 'user-a', targetUserId: 'user-b' });
  assert.equal(followed.followingId, 'user-b');
  const removed = await unfollowUser({ repository, userId: 'user-a', targetUserId: 'user-b' });
  assert.equal(removed.removed, true);
});

test('messaging is member-authorized and sender-only deletion is enforced', async () => {
  const repository = createRepository();
  await repository.create('users', { id: 'user-a', email: 'a@example.com' });
  await repository.create('users', { id: 'user-b', email: 'b@example.com' });
  await repository.create('users', { id: 'user-c', email: 'c@example.com' });
  const conversation = await createConversation({ repository, userId: 'user-a', otherUserId: 'user-b' });
  const message = await sendMessage({ repository, userId: 'user-a', conversationId: conversation.id, body: { text: 'Hello.' } });
  assert.equal((await listMessages({ repository, userId: 'user-b', conversationId: conversation.id })).length, 1);
  await assert.rejects(() => listMessages({ repository, userId: 'user-c', conversationId: conversation.id }), { code: 'FORBIDDEN' });
  await assert.rejects(() => deleteMessage({ repository, userId: 'user-b', messageId: message.id }), { code: 'FORBIDDEN' });
  const deleted = await deleteMessage({ repository, userId: 'user-a', messageId: message.id });
  assert.equal(deleted.id, message.id);
  assert.equal((await listMessages({ repository, userId: 'user-b', conversationId: conversation.id })).length, 0);
});
