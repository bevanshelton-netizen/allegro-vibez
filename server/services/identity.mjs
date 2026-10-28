import { hashPassword, verifyPassword, issueSessionToken, hashSessionToken } from '../domain/auth.mjs';
import { email, requiredString, assertObject } from '../domain/validation.mjs';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

async function createSession(repository, userId) {
  const token = issueSessionToken();
  const now = new Date();
  await repository.create('sessions', {
    tokenHash: hashSessionToken(token),
    userId,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
    revokedAt: null
  });
  return token;
}

export async function register({ repository, body }) {
  assertObject(body);
  const normalizedEmail = email(body.email);
  const password = requiredString(body.password, 'password', { min: 12, max: 200 });
  const existing = await repository.get('users', { email: normalizedEmail });
  if (existing) {
    const error = new Error('An account with this email already exists');
    error.code = 'CONFLICT';
    throw error;
  }
  const user = await repository.create('users', {
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    status: 'ACTIVE'
  });
  const token = await createSession(repository, user.id);
  return { user: { id: user.id, email: user.email, status: user.status }, token };
}

export async function login({ repository, body }) {
  assertObject(body);
  const normalizedEmail = email(body.email);
  const password = requiredString(body.password, 'password', { min: 12, max: 200 });
  const user = await repository.get('users', { email: normalizedEmail });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    const error = new Error('Invalid email or password');
    error.code = 'UNAUTHORIZED';
    throw error;
  }
  const token = await createSession(repository, user.id);
  return { user: { id: user.id, email: user.email, status: user.status }, token };
}

export async function currentUser({ repository, token }) {
  const tokenHash = hashSessionToken(token);
  if (!tokenHash) {
    const error = new Error('Authentication required');
    error.code = 'UNAUTHORIZED';
    throw error;
  }
  const session = await repository.get('sessions', { tokenHash });
  if (!session || session.revokedAt || !session.expiresAt || new Date(session.expiresAt).getTime() <= Date.now()) {
    const error = new Error('Invalid or expired session');
    error.code = 'UNAUTHORIZED';
    throw error;
  }
  const user = await repository.get('users', { id: session.userId });
  if (!user || user.status !== 'ACTIVE') {
    const error = new Error('Account not available');
    error.code = 'UNAUTHORIZED';
    throw error;
  }
  return { id: user.id, email: user.email, status: user.status };
}

export async function logout({ repository, token }) {
  const tokenHash = hashSessionToken(token);
  if (!tokenHash) return { ok: true };
  await repository.update('sessions', { tokenHash }, { revokedAt: new Date().toISOString() });
  return { ok: true };
}
