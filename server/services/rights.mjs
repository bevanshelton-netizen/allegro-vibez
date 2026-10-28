import { normalizeSplits } from '../domain/rights.mjs';
import { id } from '../domain/validation.mjs';

export async function setRightsSplits({ repository, userId, releaseId, splits }) {
  const release = await repository.get('releases', { id: id(releaseId, 'releaseId') });
  if (!release) return null;
  const artist = await repository.get('artists', { id: release.artistId });
  if (!artist || artist.userId !== userId) {
    const error = new Error('You do not own this release');
    error.code = 'UNAUTHORIZED';
    throw error;
  }
  const normalized = normalizeSplits(splits);
  const existing = await repository.list('rights_splits', { releaseId: release.id });
  for (const split of existing) await repository.delete('rights_splits', split.id);
  const created = [];
  for (const split of normalized) {
    created.push(await repository.create('rights_splits', { releaseId: release.id, ...split }));
  }
  return created;
}

export async function getRightsSplits({ repository, releaseId }) {
  return repository.list('rights_splits', { releaseId: id(releaseId, 'releaseId') });
}
