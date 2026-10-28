import { assertTransition, RELEASE_TRANSITIONS } from '../domain/state.mjs';
import { id, requiredString, assertObject } from '../domain/validation.mjs';

function releaseInput(body) {
  assertObject(body);
  return {
    title: requiredString(body.title, 'title', { max: 200 }),
    releaseType: requiredString(body.releaseType ?? 'SINGLE', 'releaseType', { max: 40 }),
    genre: typeof body.genre === 'string' ? body.genre.trim().slice(0, 80) : '',
    artworkUrl: typeof body.artworkUrl === 'string' ? body.artworkUrl.trim().slice(0, 2048) : '',
    releaseDate: typeof body.releaseDate === 'string' ? body.releaseDate.trim().slice(0, 32) : ''
  };
}

export async function createRelease({ repository, userId, artistId, body }) {
  const artist = await repository.get('artists', { id: id(artistId, 'artistId') });
  if (!artist || artist.userId !== userId) {
    const error = new Error('Artist profile not found or not owned by this account');
    error.code = 'UNAUTHORIZED';
    throw error;
  }
  return repository.create('releases', { ...releaseInput(body), artistId: artist.id, status: 'DRAFT' });
}

export async function getRelease({ repository, releaseId }) {
  return repository.get('releases', { id: id(releaseId, 'releaseId') });
}

export async function submitRelease({ repository, userId, releaseId }) {
  const release = await getRelease({ repository, releaseId });
  if (!release) return null;
  const artist = await repository.get('artists', { id: release.artistId });
  if (!artist || artist.userId !== userId) {
    const error = new Error('You do not own this release');
    error.code = 'UNAUTHORIZED';
    throw error;
  }
  const splits = await repository.list('rights_splits', { releaseId: release.id });
  const total = splits.reduce((sum, split) => sum + Number(split.sharePercent || 0), 0);
  if (Math.abs(total - 100) > 0.000001) {
    const error = new Error('Rights splits must total exactly 100% before submission');
    error.code = 'INVALID_REQUEST';
    throw error;
  }
  assertTransition(release.status, 'SUBMITTED', RELEASE_TRANSITIONS);
  return repository.update('releases', release.id, { status: 'SUBMITTED' });
}
