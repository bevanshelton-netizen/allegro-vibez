import { assertObject } from '../domain/validation.mjs';

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
  const entries = await repository.list('ledger_entries', { accountId: userId });
  const payouts = await repository.list('payouts', { userId });
  const currencyEntries = entries.filter((entry) => (entry.currency ?? currency) === currency);
  const currencyPayouts = payouts.filter((payout) => (payout.currency ?? currency) === currency);
  const credits = currencyEntries.filter((entry) => ['CREDIT', 'EARNING', 'ROYALTY'].includes(entry.entryType));
  const debits = currencyEntries.filter((entry) => ['DEBIT', 'FEE', 'ADJUSTMENT_DEBIT'].includes(entry.entryType));
  const earnedMinor = sum(credits);
  const debitedMinor = sum(debits);
  const paidOutMinor = sum(currencyPayouts.filter((payout) => ['COMPLETED', 'PAID'].includes(payout.status)));
  const availableMinor = earnedMinor - debitedMinor - paidOutMinor;
  return {
    currency,
    earnedMinor,
    debitedMinor,
    paidOutMinor,
    availableMinor,
    entries: currencyEntries,
    payouts: currencyPayouts
  };
}

export async function requestPayout({ repository, userId, body }) {
  assertObject(body);
  const currency = typeof body.currency === 'string' ? body.currency.toUpperCase() : 'ZAR';
  const amountMinor = Number(body.amountMinor);
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    const error = new Error('amountMinor must be a positive integer');
    error.code = 'INVALID_REQUEST';
    throw error;
  }
  const earnings = await getEarnings({ repository, userId, currency });
  if (amountMinor > earnings.availableMinor) {
    const error = new Error('Requested payout exceeds available balance');
    error.code = 'CONFLICT';
    throw error;
  }
  return repository.create('payouts', {
    userId,
    amountMinor,
    currency,
    status: 'REQUESTED',
    requestedAt: new Date().toISOString()
  });
}
