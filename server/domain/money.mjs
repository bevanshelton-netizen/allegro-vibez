const ISO_CURRENCY = /^[A-Z]{3}$/;

export function money(amountMinor, currency) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    const error = new Error('amountMinor must be a non-negative safe integer');
    error.code = 'INVALID_REQUEST';
    throw error;
  }
  if (typeof currency !== 'string' || !ISO_CURRENCY.test(currency)) {
    const error = new Error('currency must be a three-letter ISO currency code');
    error.code = 'INVALID_REQUEST';
    throw error;
  }
  return Object.freeze({ amountMinor, currency });
}

export function assertIdempotencyKey(value) {
  if (typeof value !== 'string' || value.length < 16 || value.length > 128) {
    const error = new Error('idempotency key must be 16-128 characters');
    error.code = 'INVALID_REQUEST';
    throw error;
  }
  return value;
}
