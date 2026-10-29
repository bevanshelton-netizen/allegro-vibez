import crypto from 'node:crypto';
import { assertObject, id, requiredString } from '../domain/validation.mjs';

function requireUserId(userId) { return id(userId, 'userId'); }

export async function followUser({ repository, userId, targetUserId }) {
  const followerId = requireUserId(userId);
  const followingId = id(targetUserId, 'targetUserId');
  if (followerId === followingId) throw Object.assign(new Error('You cannot follow yourself.'), { code: 'INVALID_REQUEST' });
  const target = await repository.get('users', followingId);
  if (!target) throw Object.assign(new Error('User not found.'), { code: 'NOT_FOUND' });
  const existing = await repository.list('follows', { followerId, followingId });
  if (existing[0]) return existing[0];
  const record = { id: crypto.randomUUID(), followerId, followingId, createdAt: new Date().toISOString() };
  await repository.create('follows', record);
  return record;
}

export async function unfollowUser({ repository, userId, targetUserId }) {
  const followerId = requireUserId(userId);
  const followingId = id(targetUserId, 'targetUserId');
  const rows = await repository.list('follows', { followerId, followingId });
  if (!rows[0]) return { removed: false };
  await repository.delete('follows', rows[0].id);
  return { removed: true };
}

export async function listFollowing({ repository, userId, limit = 100 }) {
  const followerId = requireUserId(userId);
  const rows = await repository.list('follows', { followerId });
  return rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, Math.min(Math.max(Number(limit) || 100, 1), 100));
}

export async function listFollowers({ repository, userId, limit = 100 }) {
  const followingId = requireUserId(userId);
  const rows = await repository.list('follows', { followingId });
  return rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, Math.min(Math.max(Number(limit) || 100, 1), 100));
}

export async function createConversation({ repository, userId, otherUserId }) {
  const memberA = requireUserId(userId);
  const memberB = id(otherUserId, 'otherUserId');
  if (memberA === memberB) throw Object.assign(new Error('A conversation requires another user.'), { code: 'INVALID_REQUEST' });
  if (!(await repository.get('users', memberB))) throw Object.assign(new Error('User not found.'), { code: 'NOT_FOUND' });
  const memberships = await repository.list('conversation_members', { userId: memberA });
  for (const membership of memberships) {
    const members = await repository.list('conversation_members', { conversationId: membership.conversationId });
    if (members.some((m) => m.userId === memberB)) return await repository.get('conversations', membership.conversationId);
  }
  const now = new Date().toISOString();
  const conversation = { id: crypto.randomUUID(), createdAt: now, updatedAt: now };
  await repository.create('conversations', conversation);
  await repository.create('conversation_members', { id: crypto.randomUUID(), conversationId: conversation.id, userId: memberA, joinedAt: now });
  await repository.create('conversation_members', { id: crypto.randomUUID(), conversationId: conversation.id, userId: memberB, joinedAt: now });
  return conversation;
}

async function requireMember({ repository, conversationId, userId }) {
  const members = await repository.list('conversation_members', { conversationId, userId });
  if (!members[0]) throw Object.assign(new Error('You are not a member of this conversation.'), { code: 'FORBIDDEN' });
}

export async function listConversations({ repository, userId, limit = 50 }) {
  const memberId = requireUserId(userId);
  const memberships = await repository.list('conversation_members', { userId: memberId });
  const conversations = [];
  for (const membership of memberships) {
    const conversation = await repository.get('conversations', membership.conversationId);
    if (conversation) conversations.push(conversation);
  }
  return conversations.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0, Math.min(Math.max(Number(limit) || 50, 1), 100));
}

export async function listMessages({ repository, userId, conversationId, limit = 100 }) {
  const memberId = requireUserId(userId);
  const cid = id(conversationId, 'conversationId');
  await requireMember({ repository, conversationId: cid, userId: memberId });
  const rows = await repository.list('messages', { conversationId: cid });
  return rows.filter((message) => !message.deletedAt).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))).slice(-Math.min(Math.max(Number(limit) || 100, 1), 100));
}

export async function sendMessage({ repository, userId, conversationId, body }) {
  const senderId = requireUserId(userId);
  const cid = id(conversationId, 'conversationId');
  await requireMember({ repository, conversationId: cid, userId: senderId });
  assertObject(body);
  const text = requiredString(body.text, 'text', { max: 4000 });
  const now = new Date().toISOString();
  const message = { id: crypto.randomUUID(), conversationId: cid, senderId, body: text, createdAt: now, deletedAt: null };
  await repository.create('messages', message);
  await repository.update('conversations', cid, { updatedAt: now });
  return message;
}

export async function deleteMessage({ repository, userId, messageId }) {
  const senderId = requireUserId(userId);
  const mid = id(messageId, 'messageId');
  const message = await repository.get('messages', mid);
  if (!message) throw Object.assign(new Error('Message not found.'), { code: 'NOT_FOUND' });
  if (message.senderId !== senderId) throw Object.assign(new Error('Only the sender can delete this message.'), { code: 'FORBIDDEN' });
  const deletedAt = new Date().toISOString();
  await repository.update('messages', mid, { deletedAt });
  return { id: mid, deletedAt };
}
