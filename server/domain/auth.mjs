import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const ITERATIONS = 16384;

export function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12) {
    const error = new Error('Password must be at least 12 characters');
    error.code = 'INVALID_REQUEST';
    throw error;
  }
  const salt = randomBytes(SALT_LENGTH);
  const derived = scryptSync(password, salt, KEY_LENGTH, { N: ITERATIONS, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || typeof encoded !== 'string') return false;
  const [algorithm, saltText, hashText] = encoded.split('$');
  if (algorithm !== 'scrypt' || !saltText || !hashText) return false;
  try {
    const salt = Buffer.from(saltText, 'base64url');
    const expected = Buffer.from(hashText, 'base64url');
    const actual = scryptSync(password, salt, expected.length, { N: ITERATIONS, r: 8, p: 1 });
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function issueSessionToken() {
  return randomBytes(32).toString('base64url');
}

export const AUTH_CONTRACT = Object.freeze({
  passwordAlgorithm: 'scrypt',
  sessionTokenType: 'opaque-random',
  sessionStorage: 'server-side',
  productionRequirement: 'persistent-store-plus-secure-cookie-or-equivalent'
});
