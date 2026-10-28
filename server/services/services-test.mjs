import assert from 'node:assert/strict';
import test from 'node:test';
import { register, login, currentUser } from './identity.mjs';
import { createArtist, getArtist } from './artists.mjs';
import { createRelease, submitRelease } from './releases.mjs';
import { setRightsSplits, getRightsSplits } from './rights.mjs';

function memoryRepository() {
  const data = new Map();
  let seq = 0;
  const collection = (name) => { if (!data.has(name)) data.set(name, new Map()); return data.get(name); };
  return {
    async create(name, input) { const id = `${name}-${++seq}`; const row = { id, createdAt: new Date().toISOString(), ...input }; collection(name).set(id, row); return row; },
    async get(name, filter = {}) { return [...collection(name).values()].find((row) => Object.entries(filter).every(([key, value]) => row[key] === value)) ?? null; },
    async list(name, filter = {}) { return [...collection(name).values()].filter((row) => Object.entries(filter).every(([key, value]) => row[key] === value)); },
    async update(name, id, patch) { const row = collection(name).get(id); if (!row) return null; const updated = { ...row, ...patch, updatedAt: new Date().toISOString() }; collection(name).set(id, updated); return updated; },
    async delete(name, id) { return collection(name).delete(id); }
  };
}

test('creator onboarding to release submission and rights ownership', async () => {
  const repository = memoryRepository();
  const registration = await register({ repository, body: { email: 'nia@example.com', password: 'A-strong-password-123' } });
  assert.ok(registration.token);
  const me = await currentUser({ repository, token: registration.token });
  assert.equal(me.email, 'nia@example.com');
  const artist = await createArtist({ repository, userId: me.id, body: { stageName: 'Nia Kade', bio: 'Afrobeat creator', country: 'Nigeria', city: 'Lagos' } });
  assert.equal(artist.stageName, 'Nia Kade');
  assert.equal((await getArtist({ repository, artistId: artist.id })).id, artist.id);
  const release = await createRelease({ repository, userId: me.id, artistId: artist.id, body: { title: 'Sunrise Over Lagos', releaseType: 'SINGLE', genre: 'Afrobeat' } });
  assert.equal(release.status, 'DRAFT');
  await setRightsSplits({ repository, userId: me.id, releaseId: release.id, splits: [
    { partyId: me.id, partyType: 'USER', sharePercent: 80, role: 'ARTIST' },
    { partyId: 'producer-1', partyType: 'USER', sharePercent: 20, role: 'PRODUCER' }
  ] });
  const splits = await getRightsSplits({ repository, releaseId: release.id });
  assert.equal(splits.reduce((sum, item) => sum + item.sharePercent, 0), 100);
  const submitted = await submitRelease({ repository, userId: me.id, releaseId: release.id });
  assert.equal(submitted.status, 'SUBMITTED');
});

test('release cannot be submitted before rights are complete', async () => {
  const repository = memoryRepository();
  const registration = await register({ repository, body: { email: 'pending@example.com', password: 'A-strong-password-456' } });
  const artist = await createArtist({ repository, userId: registration.user.id, body: { stageName: 'Maya Vale' } });
  const release = await createRelease({ repository, userId: registration.user.id, artistId: artist.id, body: { title: 'After Midnight' } });
  await assert.rejects(submitRelease({ repository, userId: registration.user.id, releaseId: release.id }), (error) => error.code === 'INVALID_REQUEST');
});

test('rights cannot accept a non-100% ownership split', async () => {
  const repository = memoryRepository();
  const registration = await register({ repository, body: { email: 'artist2@example.com', password: 'A-strong-password-456' } });
  const artist = await createArtist({ repository, userId: registration.user.id, body: { stageName: 'Kairo Saint' } });
  const release = await createRelease({ repository, userId: registration.user.id, artistId: artist.id, body: { title: 'Gold Dust' } });
  await assert.rejects(setRightsSplits({ repository, userId: registration.user.id, releaseId: release.id, splits: [{ partyId: registration.user.id, sharePercent: 99 }] }), (error) => error.code === 'INVALID_REQUEST');
});

test('login rejects an incorrect password', async () => {
  const repository = memoryRepository();
  await register({ repository, body: { email: 'login@example.com', password: 'A-strong-password-789' } });
  await assert.rejects(login({ repository, body: { email: 'login@example.com', password: 'wrong-password-123' } }), (error) => error.code === 'UNAUTHORIZED');
});
