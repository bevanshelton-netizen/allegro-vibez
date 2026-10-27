const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

export function assertObject(value, field = 'body') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    const error = new Error(`${field} must be an object`);
    error.code = 'INVALID_REQUEST';
    throw error;
  }
  return value;
}

export function requiredString(value, field, { max = 255, min = 1 } = {}) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) {
    const error = new Error(`${field} must be a string between ${min} and ${max} characters`);
    error.code = 'INVALID_REQUEST';
    throw error;
  }
  return value.trim();
}

export function email(value, field = 'email') {
  const normalized = requiredString(value, field, { max: 320 });
  if (!EMAIL.test(normalized)) {
    const error = new Error(`${field} must be a valid email address`);
    error.code = 'INVALID_REQUEST';
    throw error;
  }
  return normalized.toLowerCase();
}

export function id(value, field = 'id') {
  const normalized = requiredString(value, field, { max: 128 });
  if (!SAFE_ID.test(normalized)) {
    const error = new Error(`${field} contains invalid characters`);
    error.code = 'INVALID_REQUEST';
    throw error;
  }
  return normalized;
}

export function jsonBody(req, { maxBytes = 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        const error = new Error('Request body is too large');
        error.code = 'PAYLOAD_TOO_LARGE';
        reject(error);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (size === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        const error = new Error('Request body must contain valid JSON');
        error.code = 'INVALID_JSON';
        reject(error);
      }
    });
    req.on('error', reject);
  });
}
