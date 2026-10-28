import { assertTransition, RELEASE_TRANSITIONS } from '../domain/state.mjs';
import { id, requiredString } from '../domain/validation.mjs';

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

function audit(repository, payload) {
  return repository.create('audit_events', {
    id: crypto.randomUUID(),
    ...payload,
    occurredAt: new Date().toISOString()
  });
}

import crypto from 'node:crypto';

export async function approveRelease({ repository, releaseId, approvalSecretValue, requestId }) {
  if (!approvalSecretValue || approvalSecretValue !== approvalSecret()) throw error('Release approval denied', 'FORBIDDEN');
  const release = await repository.get('releases', { id: id(releaseId, 'releaseId') });
  if (!release) throw error('Release not found', 'NOT_FOUND');
  assertTransition(release.status, 'APPROVED', RELEASE_TRANSITIONS);
  const updated = await repository.update('releases', release.id, { status: 'APPROVED', approvedAt: new Date().toISOString() });
  await audit(repository, { actorId: 'release-approval-control', entityType: 'release', entityId: release.id, requestId: requestId ?? null, metadataJson: JSON.stringify({ action: 'APPROVE_RELEASE' }) });
  return updated;
}

export async function publishRelease({ repository, userId, releaseId, requestId }) {
  const release = await repository.get('releases', { id: id(releaseId, 'releaseId') });
  if (!release) throw error('Release not found', 'NOT_FOUND');
  const artist = await repository.get('artists', { id: release.artistId });
  if (!artist || artist.userId !== userId) throw error('You do not own this release', 'UNAUTHORIZED');
  if (release.status !== 'APPROVED') throw error('Only an approved release can be published', 'CONFLICT');
  const updated = await repository.update('releases', release.id, { status: 'PUBLISHED', publishedAt: new Date().toISOString() });
  await audit(repository, { actorId: userId, entityType: 'release', entityId: release.id, requestId: requestId ?? null, metadataJson: JSON.stringify({ action: 'PUBLISH_RELEASE' }) });
  return updated;
}
