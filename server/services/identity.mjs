import { hashPassword, verifyPassword, issueSessionToken } from '../domain/auth.mjs';
import { email, requiredString, assertObject } from '../domain/validation.mjs';

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
  const token = issueSessionToken();
  await repository.create('sessions', { token, userId: user.id });
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
  const token = issueSessionToken();
  await repository.create('sessions', { token, userId: user.id });
  return { user: { id: user.id, email: user.email, status: user.status }, token };
}

export async function currentUser({ repository, token }) {
  if (!token) {
    const error = new Error('Authentication required');
    error.code = 'UNAUTHORIZED';
    throw error;
  }
  const session = await repository.get('sessions', { token });
  if (!session) {
    const error = new Error('Invalid session');
    error.code = 'UNAUTHORIZED';
    throw error;
  }
  const user = await repository.get('users', { id: session.userId });
  if (!user) {
    const error = new Error('Account not found');
    error.code = 'UNAUTHORIZED';
    throw error;
  }
  return { id: user.id, email: user.email, status: user.status };
}
