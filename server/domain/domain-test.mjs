import assert from 'node:assert/strict';
import test from 'node:test';
import { hashPassword, verifyPassword, issueSessionToken } from './auth.mjs';
import { email, id, requiredString } from './validation.mjs';
import { createRepository, RepositoryNotConfiguredError } from './repository.mjs';

 test('password hashing verifies without storing plaintext', () => {
  const password = 'A-strong-password-123';
  const encoded = hashPassword(password);
  assert.match(encoded, /^scrypt\$/);
  assert.equal(verifyPassword(password, encoded), true);
  assert.equal(verifyPassword('wrong-password-123', encoded), false);
});

test('session tokens are opaque and non-empty', () => {
  const a = issueSessionToken();
  const b = issueSessionToken();
  assert.equal(typeof a, 'string');
  assert.ok(a.length >= 32);
  assert.notEqual(a, b);
});

test('request validation normalizes safe identity fields', () => {
  assert.equal(email(' Artist@Example.COM '), 'artist@example.com');
  assert.equal(id('artist_01'), 'artist_01');
  assert.equal(requiredString('  Nia Kade  ', 'name'), 'Nia Kade');
  assert.throws(() => email('not-an-email'), /valid email/);
  assert.throws(() => id('../bad'), /invalid characters/);
});

test('repository contract fails closed when persistence is absent', async () => {
  const repository = createRepository();
  await assert.rejects(
    repository.get('users', { id: 'missing' }),
    (error) => error instanceof RepositoryNotConfiguredError && error.code === 'NOT_CONFIGURED'
  );
});
