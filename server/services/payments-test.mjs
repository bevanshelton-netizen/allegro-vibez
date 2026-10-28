import assert from 'node:assert/strict';
import { createOrder, getOrder, verifyPayment } from './payments.mjs';

function repository() {
  const data = new Map();
  return {
    async create(collection, value) {
      const rows = data.get(collection) ?? [];
      rows.push(structuredClone(value));
      data.set(collection, rows);
      return structuredClone(value);
    },
    async get(collection, filters = {}) {
      const rows = data.get(collection) ?? [];
      return structuredClone(rows.find((row) => Object.entries(filters).every(([key, value]) => row[key] === value)) ?? null);
    },
    async list(collection, filters = {}) {
      const rows = data.get(collection) ?? [];
      return structuredClone(rows.filter((row) => Object.entries(filters).every(([key, value]) => row[key] === value)));
    },
    async update(collection, filters, value) {
      const rows = data.get(collection) ?? [];
      const index = rows.findIndex((row) => Object.entries(filters).every(([key, expected]) => row[key] === expected));
      if (index < 0) return null;
      rows[index] = { ...rows[index], ...structuredClone(value) };
      data.set(collection, rows);
      return structuredClone(rows[index]);
    }
  };
}

const repo = repository();
const userId = 'user-1';
const order = await createOrder({
  repository: repo,
  userId,
  requestId: 'req-1',
  body: { subtotalMinor: 59900, totalMinor: 59900, currency: 'ZAR', provider: 'iKhokha', idempotencyKey: 'checkout-123456' }
});
assert.equal(order.status, 'PENDING_PAYMENT');
assert.equal(order.totalMinor, 59900);

const replay = await createOrder({
  repository: repo,
  userId,
  body: { subtotalMinor: 59900, totalMinor: 59900, currency: 'ZAR', provider: 'iKhokha', idempotencyKey: 'checkout-123456' }
});
assert.equal(replay.id, order.id);

await assert.rejects(
  () => verifyPayment({ repository: repo, paymentId: order.paymentId, providerReference: 'IK-123', verified: true, reconciliationSecret: 'wrong' }),
  (error) => error.code === 'NOT_CONFIGURED'
);

process.env.ALLEGRO_PAYMENT_RECONCILIATION_SECRET = 'test-secret';
const payment = await verifyPayment({ repository: repo, paymentId: order.paymentId, providerReference: 'IK-123', verified: true, requestId: 'req-2', reconciliationSecret: 'test-secret' });
assert.equal(payment.status, 'VERIFIED');

const finalOrder = await getOrder({ repository: repo, userId, orderId: order.id });
assert.equal(finalOrder.status, 'PAID');
assert.equal(finalOrder.payment.status, 'VERIFIED');
const captures = await repo.list('ledger_entries', { idempotencyKey: `payment:${order.paymentId}:verified` });
assert.equal(captures.length, 1);

console.log('payments service tests passed');
