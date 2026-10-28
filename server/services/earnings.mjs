import { randomUUID } from 'node:crypto';
import { assertObject } from '../domain/validation.mjs';

const CURRENCIES = new Set(['ZAR', 'USD', 'EUR', 'GBP']);

function minorAmount(value) {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount)) return 0;
  return amount;
}

function sum(rows) {
  return rows.reduce((total, row) => total + minorAmount(row.amountMinor), 0);
}

export async function getEarnings({ repository, userId, currency = 'ZAR' }) {
  if (!userId) {
    const error = new Error('Authentication required');
    error.code = 'UNAUTHORIZED';
    throw error;
  }
  const normalizedCurrency = typeof currency === 'string' ? currency.toUpperCase() : 'ZAR';
  if (!CURRENCIES.has(normalizedCurrency)) {
    const error = new Error('Unsupported currency');
    error.code = 'INVALID_REQUEST';
    throw error;
  }
  const entries = await repository.list('ledger_entries', { accountId: userId });
  const payouts = await repository.list('payouts', { userId });
  const currencyEntries = entries.filter((entry) => (entry.currency ?? normalizedCurrency) === normalizedCurrency);
  const currencyPayouts = payouts.filter((payout) => (payout.currency ?? normalizedCurrency) === normalizedCurrency);
  const credits = currencyEntries.filter((entry) => ['CREDIT', 'EARNING', 'ROYALTY'].includes(entry.entryType));
  const debits = currencyEntries.filter((entry) => ['DEBIT', 'FEE', 'ADJUSTMENT_DEBIT'].includes(entry.entryType));
  const earnedMinor = sum(credits);
  const debitedMinor = sum(debits);
  const reservedMinor = sum(currencyPayouts.filter((payout) => ['REQUESTED', 'PROCESSING', 'COMPLETED', 'PAID'].includes(payout.status)));
  const paidOutMinor = sum(currencyPayouts.filter((payout) => ['COMPLETED', 'PAID'].includes(payout.status)));
  const availableMinor = earnedMinor - debitedMinor - reservedMinor;
  return {
    currency: normalizedCurrency,
    earnedMinor,
    debitedMinor,
    reservedMinor,
    paidOutMinor,
    availableMinor,
    entries: currencyEntries,
    payouts: currencyPayouts
  };
}

export async function requestPayout({ repository, userId, body, idempotencyKey = null, requestId = null }) {
  assertObject(body);
  const currency = typeof body.currency === 'string' ? body.currency.toUpperCase() : 'ZAR';
  if (!CURRENCIES.has(currency)) {
    const error = new Error('Unsupported currency');
    error.code = 'INVALID_REQUEST';
    throw error;
  }
  const amountMinor = Number(body.amountMinor);
  const key = typeof (body.idempotencyKey ?? idempotencyKey) === 'string' ? String(body.idempotencyKey ?? idempotencyKey).trim() : '';
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    const error = new Error('amountMinor must be a positive integer');
    error.code = 'INVALID_REQUEST';
    throw error;
  }
  if (key.length > 200) {
    const error = new Error('idempotencyKey is too long');
    error.code = 'INVALID_REQUEST';
    throw error;
  }
  if (key) {
    const existing = await repository.get('payouts', { idempotencyKey: key });
    if (existing && existing.userId === userId) return existing;
    if (existing && existing.userId !== userId) {
      const error = new Error('Idempotency key is already in use');
      error.code = 'CONFLICT';
      throw error;
    }
  }
  const earnings = await getEarnings({ repository, userId, currency });
  if (amountMinor > earnings.availableMinor) {
    const error = new Error('Requested payout exceeds available balance');
    error.code = 'CONFLICT';
    throw error;
  }
  const payout = await repository.create('payouts', {
    userId,
    amountMinor,
    currency,
    status: 'REQUESTED',
    idempotencyKey: key || null,
    requestedAt: new Date().toISOString()
  });
  await repository.create('audit_events', {
    id: randomUUID(),
    actorId: userId,
    action: 'PAYOUT_REQUESTED',
    entityType: 'PAYOUT',
    entityId: payout.id,
    requestId,
    metadataJson: JSON.stringify({ amountMinor, currency, idempotencyKey: key || null }),
    createdAt: new Date().toISOString()
  });
  return payout;
}
