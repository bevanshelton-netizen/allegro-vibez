import { randomUUID } from 'node:crypto';
import { assertObject, requiredString } from '../domain/validation.mjs';

const CURRENCIES = new Set(['ZAR', 'USD', 'EUR', 'GBP']);
const ORDER_STATES = new Set(['PENDING_PAYMENT', 'PAID', 'CANCELLED', 'FULFILLED']);
const PAYMENT_STATES = new Set(['PENDING', 'VERIFIED', 'FAILED', 'CANCELLED', 'REFUNDED']);

function fail(message, code = 'INVALID_REQUEST') {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function amountMinor(value, field) {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < 0) fail(`${field} must be a non-negative integer`);
  return amount;
}

function currency(value) {
  const normalized = typeof value === 'string' ? value.toUpperCase() : 'ZAR';
  if (!CURRENCIES.has(normalized)) fail('Unsupported currency');
  return normalized;
}

function idempotencyKey(body, headerValue) {
  const value = body?.idempotencyKey ?? headerValue;
  if (typeof value !== 'string' || value.trim().length < 8 || value.trim().length > 200) {
    fail('idempotencyKey is required and must be 8-200 characters');
  }
  return value.trim();
}

async function audit(repository, { actorId, action, entityType, entityId, requestId, metadata }) {
  return repository.create('audit_events', {
    id: randomUUID(),
    actorId,
    action,
    entityType,
    entityId,
    requestId: requestId ?? null,
    metadataJson: metadata ?? {},
    createdAt: new Date().toISOString()
  });
}

export async function createOrder({ repository, userId, body, requestId }) {
  assertObject(body);
  const currencyCode = currency(body.currency);
  const subtotalMinor = amountMinor(body.subtotalMinor, 'subtotalMinor');
  const totalMinor = amountMinor(body.totalMinor ?? subtotalMinor, 'totalMinor');
  if (totalMinor < subtotalMinor) fail('totalMinor cannot be less than subtotalMinor');

  const key = idempotencyKey(body, null);
  const existingLedger = await repository.get('ledger_entries', { idempotencyKey: `order:${userId}:${key}` });
  if (existingLedger?.referenceType === 'ORDER' && existingLedger.referenceId) {
    const existing = await repository.get('orders', { id: existingLedger.referenceId });
    if (existing) return existing;
  }

  const orderId = randomUUID();
  const paymentId = randomUUID();
  const now = new Date().toISOString();
  const order = await repository.create('orders', {
    id: orderId,
    userId,
    currency: currencyCode,
    subtotalMinor,
    totalMinor,
    paymentId,
    status: 'PENDING_PAYMENT',
    createdAt: now,
    updatedAt: now
  });

  await repository.create('payments', {
    id: paymentId,
    orderId,
    provider: requiredString(body.provider ?? 'IKHOKHA', 'provider', { max: 64 }).toUpperCase(),
    providerReference: null,
    amountMinor: totalMinor,
    currency: currencyCode,
    status: 'PENDING',
    verifiedAt: null,
    createdAt: now,
    updatedAt: now
  });

  await repository.create('ledger_entries', {
    id: randomUUID(),
    accountId: userId,
    entryType: 'ORDER_AUTHORIZATION',
    amountMinor: 0,
    currency: currencyCode,
    referenceType: 'ORDER',
    referenceId: orderId,
    idempotencyKey: `order:${userId}:${key}`,
    status: 'RECORDED',
    occurredAt: now,
    createdAt: now
  });

  await audit(repository, {
    actorId: userId,
    action: 'ORDER_CREATED',
    entityType: 'ORDER',
    entityId: orderId,
    requestId,
    metadata: { paymentId, currency: currencyCode, totalMinor }
  });
  return order;
}

export async function getOrder({ repository, userId, orderId }) {
  const order = await repository.get('orders', { id: orderId });
  if (!order || order.userId !== userId) fail('Order not found', 'NOT_FOUND');
  const payment = order.paymentId ? await repository.get('payments', { id: order.paymentId }) : null;
  return { ...order, payment };
}

export async function verifyPayment({ repository, paymentId, providerReference, verified, requestId, reconciliationSecret }) {
  if (!reconciliationSecret || reconciliationSecret !== process.env.ALLEGRO_PAYMENT_RECONCILIATION_SECRET) {
    fail('Payment reconciliation adapter is not configured', 'NOT_CONFIGURED');
  }
  const payment = await repository.get('payments', { id: paymentId });
  if (!payment) fail('Payment not found', 'NOT_FOUND');
  if (payment.status === 'VERIFIED') return payment;
  if (typeof verified !== 'boolean') fail('verified must be boolean');
  const reference = requiredString(providerReference, 'providerReference', { max: 255 });
  const now = new Date().toISOString();
  const nextStatus = verified ? 'VERIFIED' : 'FAILED';
  const updated = await repository.update('payments', { id: paymentId }, {
    status: nextStatus,
    providerReference: reference,
    verifiedAt: verified ? now : null,
    updatedAt: now
  });
  const order = await repository.get('orders', { id: payment.orderId });
  if (order) {
    await repository.update('orders', { id: order.id }, {
      status: verified ? 'PAID' : 'PENDING_PAYMENT',
      updatedAt: now
    });
  }
  if (verified) {
    const key = `payment:${paymentId}:verified`;
    const existing = await repository.get('ledger_entries', { idempotencyKey: key });
    if (!existing) {
      await repository.create('ledger_entries', {
        id: randomUUID(),
        accountId: order?.userId ?? payment.orderId,
        entryType: 'PAYMENT_CAPTURE',
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        referenceType: 'PAYMENT',
        referenceId: paymentId,
        idempotencyKey: key,
        status: 'POSTED',
        occurredAt: now,
        createdAt: now
      });
    }
  }
  await audit(repository, {
    actorId: order?.userId ?? null,
    action: `PAYMENT_${nextStatus}`,
    entityType: 'PAYMENT',
    entityId: paymentId,
    requestId,
    metadata: { providerReference: reference, orderId: payment.orderId }
  });
  return updated;
}

export { ORDER_STATES, PAYMENT_STATES };
