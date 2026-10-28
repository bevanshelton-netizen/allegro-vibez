import test from 'node:test';
import assert from 'node:assert/strict';
import { getEarnings, requestPayout } from './earnings.mjs';

function repo() {
  const data = {
    ledger_entries: [
      { id: 'l1', accountId: 'u1', entryType: 'EARNING', amountMinor: 12500, currency: 'ZAR' },
      { id: 'l2', accountId: 'u1', entryType: 'FEE', amountMinor: 1500, currency: 'ZAR' }
    ],
    payouts: []
  };
  return {
    async list(collection, filters) {
      return data[collection].filter((row) => Object.entries(filters).every(([key, value]) => row[key] === value));
    },
    async create(collection, value) {
      const row = { id: 'p1', ...value };
      data[collection].push(row);
      return row;
    }
  };
}

test('earnings summary uses integer minor units', async () => {
  const result = await getEarnings({ repository: repo(), userId: 'u1', currency: 'ZAR' });
  assert.equal(result.earnedMinor, 12500);
  assert.equal(result.debitedMinor, 1500);
  assert.equal(result.paidOutMinor, 0);
  assert.equal(result.availableMinor, 11000);
});

test('payout cannot exceed available balance', async () => {
  await assert.rejects(
    () => requestPayout({ repository: repo(), userId: 'u1', body: { amountMinor: 11001, currency: 'ZAR' } }),
    { code: 'CONFLICT' }
  );
});

test('payout creates a requested payout for an available balance', async () => {
  const result = await requestPayout({ repository: repo(), userId: 'u1', body: { amountMinor: 5000, currency: 'ZAR' } });
  assert.equal(result.status, 'REQUESTED');
  assert.equal(result.amountMinor, 5000);
});
