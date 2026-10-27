import { id, requiredString } from './validation.mjs';

export function createArtistInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    const error = new Error('artist must be an object');
    error.code = 'INVALID_REQUEST';
    throw error;
  }
  return Object.freeze({
    userId: id(input.userId, 'userId'),
    stageName: requiredString(input.stageName, 'stageName', { min: 1, max: 120 }),
    bio: typeof input.bio === 'string' ? input.bio.trim().slice(0, 4000) : '',
    country: typeof input.country === 'string' ? input.country.trim().slice(0, 120) : '',
    city: typeof input.city === 'string' ? input.city.trim().slice(0, 120) : ''
  });
}
