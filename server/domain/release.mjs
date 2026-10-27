import { requiredString, id } from './validation.mjs';

export function validateReleaseInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    const error = new Error('release must be an object');
    error.code = 'INVALID_REQUEST';
    throw error;
  }
  return {
    artistId: id(input.artistId, 'artistId'),
    title: requiredString(input.title, 'title', { max: 200 }),
    releaseType: requiredString(input.releaseType, 'releaseType', { max: 40 }),
    genre: input.genre == null ? null : requiredString(input.genre, 'genre', { max: 80 }),
    language: input.language == null ? null : requiredString(input.language, 'language', { max: 80 })
  };
}

export function validateReleaseId(value) {
  return id(value, 'releaseId');
}
