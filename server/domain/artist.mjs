import { requiredString, id } from './validation.mjs';

export function validateArtistInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    const error = new Error('artist must be an object');
    error.code = 'INVALID_REQUEST';
    throw error;
  }
  return {
    stageName: requiredString(input.stageName, 'stageName', { min: 1, max: 120 }),
    legalName: input.legalName == null ? null : requiredString(input.legalName, 'legalName', { max: 160 }),
    country: requiredString(input.country, 'country', { min: 2, max: 80 }),
    city: input.city == null ? null : requiredString(input.city, 'city', { max: 100 }),
    bio: input.bio == null ? null : requiredString(input.bio, 'bio', { max: 4000 }),
    genre: input.genre == null ? null : requiredString(input.genre, 'genre', { max: 80 })
  };
}

export function validateArtistId(value) {
  return id(value, 'artistId');
}
