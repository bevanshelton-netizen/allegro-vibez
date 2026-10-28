import { createArtistInput } from '../domain/artists.mjs';
import { id } from '../domain/validation.mjs';

export async function createArtist({ repository, userId, body }) {
  const input = createArtistInput({ ...body, userId });
  const existing = await repository.get('artists', { userId: input.userId });
  if (existing) {
    const error = new Error('Artist profile already exists for this account');
    error.code = 'CONFLICT';
    throw error;
  }
  return repository.create('artists', { ...input, status: 'ACTIVE' });
}

export async function listArtists({ repository }) {
  return repository.list('artists', { status: 'ACTIVE' });
}

export async function getArtist({ repository, artistId }) {
  return repository.get('artists', { id: id(artistId, 'artistId') });
}

export async function updateArtist({ repository, userId, artistId, body }) {
  const artist = await getArtist({ repository, artistId });
  if (!artist) return null;
  if (artist.userId !== userId) {
    const error = new Error('You do not own this artist profile');
    error.code = 'UNAUTHORIZED';
    throw error;
  }
  const input = createArtistInput({ ...artist, ...body, userId });
  return repository.update('artists', artist.id, input);
}
