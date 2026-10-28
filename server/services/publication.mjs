import crypto from 'node:crypto';
import { assertTransition, RELEASE_TRANSITIONS } from '../domain/state.mjs';
import { id } from '../domain/validation.mjs';
import { normalizeSplits } from '../domain/rights.mjs';

function error(message, code = 'INVALID_REQUEST') {
  const e = new Error(message);
  e.code = code;
  return e;
}

function approvalSecret() {
  const secret = process.env.ALLEGRO_RELEASE_APPROVAL_SECRET;
  if (!secret) throw error('Release approval control is not configured', 'NOT_CONFIGURED');
  return secret;
}

async function audit(repository, payload) {
  return repository.create('audit_events', {
    id: crypto.randomUUID(),
    ...payload,
    createdAt: new Date().toISOString()
  });
}

export async function approveRelease({ repository, releaseId, approvalSecretValue, requestId }) {
  if (!approvalSecretValue || approvalSecretValue !== approvalSecret()) throw error('Release approval denied', 'FORBIDDEN');
  const release = await repository.get('releases', { id: id(releaseId, 'releaseId') });
  if (!release) throw error('Release not found', 'NOT_FOUND');
  assertTransition(release.status, 'APPROVED', RELEASE_TRANSITIONS);
  const updated = await repository.update('releases', release.id, { status: 'APPROVED', approvedAt: new Date().toISOString() });
  await audit(repository, {
    actorId: 'release-approval-control',
    action: 'APPROVE_RELEASE',
    entityType: 'release',
    entityId: release.id,
    requestId: requestId ?? null,
    metadataJson: JSON.stringify({ action: 'APPROVE_RELEASE' })
  });
  return updated;
}

async function assertPublishableAudio(repository, releaseId) {
  const tracks = await repository.list('tracks', { releaseId });
  if (!tracks.length) throw error('A release must contain at least one track before publication', 'CONFLICT');

  for (const track of tracks) {
    if (!track.audioAssetId) throw error(`Track ${track.id} has no audio asset`, 'CONFLICT');
    const asset = await repository.get('audio_assets', { id: track.audioAssetId });
    if (!asset) throw error(`Audio asset ${track.audioAssetId} was not found`, 'NOT_FOUND');
    if (asset.status !== 'READY') throw error(`Audio asset ${track.audioAssetId} is not READY for publication`, 'CONFLICT');
  }
}

async function assertRightsComplete(repository, releaseId) {
  const splits = await repository.list('rights_splits', { releaseId });
  if (!splits.length) throw error('A release must have rights splits before publication', 'CONFLICT');
  try {
    normalizeSplits(splits);
  } catch (e) {
    throw error(`Release rights are not valid for publication: ${e.message}`, 'CONFLICT');
  }
}

export async function publishRelease({ repository, userId, releaseId, requestId }) {
  const release = await repository.get('releases', { id: id(releaseId, 'releaseId') });
  if (!release) throw error('Release not found', 'NOT_FOUND');
  const artist = await repository.get('artists', { id: release.artistId });
  if (!artist || artist.userId !== userId) throw error('You do not own this release', 'UNAUTHORIZED');
  if (release.status !== 'APPROVED') throw error('Only an approved release can be published', 'CONFLICT');
  await assertRightsComplete(repository, release.id);
  await assertPublishableAudio(repository, release.id);

  const updated = await repository.update('releases', release.id, { status: 'PUBLISHED', publishedAt: new Date().toISOString() });
  await audit(repository, {
    actorId: userId,
    action: 'PUBLISH_RELEASE',
    entityType: 'release',
    entityId: release.id,
    requestId: requestId ?? null,
    metadataJson: JSON.stringify({ action: 'PUBLISH_RELEASE' })
  });
  return updated;
}
