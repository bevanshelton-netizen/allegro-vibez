export const RELEASE_STATES = Object.freeze([
  'DRAFT',
  'PROCESSING',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'PUBLISHED'
]);

export const PAYMENT_STATES = Object.freeze([
  'PENDING',
  'AUTHORIZED',
  'PAID',
  'FAILED',
  'REFUNDED'
]);

export const PAYOUT_STATES = Object.freeze([
  'REQUESTED',
  'REVIEW',
  'APPROVED',
  'PROCESSING',
  'PAID',
  'FAILED'
]);

export const DISTRIBUTION_STATES = Object.freeze([
  'DRAFT',
  'QUEUED',
  'SUBMITTED',
  'DELIVERED',
  'FAILED'
]);

export function isOneOf(value, allowed) {
  return typeof value === 'string' && allowed.includes(value);
}

export function assertTransition(current, next, transitions) {
  const allowed = transitions[current] ?? [];
  if (!allowed.includes(next)) {
    throw new Error(`Invalid state transition: ${current} -> ${next}`);
  }
  return next;
}

export const RELEASE_TRANSITIONS = Object.freeze({
  DRAFT: ['PROCESSING', 'SUBMITTED'],
  PROCESSING: ['DRAFT', 'SUBMITTED'],
  SUBMITTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['PUBLISHED'],
  REJECTED: ['DRAFT'],
  PUBLISHED: []
});

export const PAYMENT_TRANSITIONS = Object.freeze({
  PENDING: ['AUTHORIZED', 'PAID', 'FAILED'],
  AUTHORIZED: ['PAID', 'FAILED'],
  PAID: ['REFUNDED'],
  FAILED: ['PENDING'],
  REFUNDED: []
});
