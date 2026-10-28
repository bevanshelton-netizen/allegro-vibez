const TABLES = new Set([
  'users', 'sessions', 'artists', 'releases', 'tracks', 'rights_splits',
  'ledger_entries', 'payments', 'payouts', 'orders', 'community_posts',
  'distribution_jobs', 'audit_events'
]);

const FIELD_MAP = Object.freeze({
  passwordHash: 'password_hash', userId: 'user_id', tokenHash: 'token_hash',
  displayName: 'display_name', stageName: 'stage_name', avatarUrl: 'avatar_url',
  artistId: 'artist_id', releaseType: 'release_type', artworkUrl: 'artwork_url',
  releaseDate: 'release_date', releaseId: 'release_id', durationMs: 'duration_ms',
  audioAssetId: 'audio_asset_id', sharePercent: 'share_percent', partyId: 'party_id',
  partyType: 'party_type', verifiedAt: 'verified_at', accountId: 'account_id',
  entryType: 'entry_type', amountMinor: 'amount_minor', referenceType: 'reference_type',
  referenceId: 'reference_id', occurredAt: 'occurred_at', orderId: 'order_id',
  providerReference: 'provider_reference', submittedAt: 'submitted_at',
  deliveredAt: 'delivered_at', failureCode: 'failure_code', actorId: 'actor_id',
  entityType: 'entity_type', entityId: 'entity_id', requestId: 'request_id',
  metadataJson: 'metadata_json', expiresAt: 'expires_at', revokedAt: 'revoked_at',
  createdAt: 'created_at', updatedAt: 'updated_at', completedAt: 'completed_at',
  requestedAt: 'requested_at', totalMinor: 'total_minor', subtotalMinor: 'subtotal_minor',
  paymentId: 'payment_id'
});

const REVERSE_FIELD_MAP = Object.freeze(Object.fromEntries(Object.entries(FIELD_MAP).map(([k, v]) => [v, k])));

function assertConfig() {
  const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serviceKey) {
    const error = new Error('Supabase persistence requires server-only SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    error.code = 'NOT_CONFIGURED';
    throw error;
  }
  return { baseUrl, serviceKey };
}

function mapOut(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([key, val]) => [REVERSE_FIELD_MAP[key] ?? key, val]));
}

function mapIn(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([key, val]) => [FIELD_MAP[key] ?? key, val]));
}

function encodeFilter(key, value) {
  if (value === null) return `${encodeURIComponent(key)}=is.null`;
  return `${encodeURIComponent(key)}=eq.${encodeURIComponent(String(value))}`;
}

async function request(table, method, { filters = {}, body, limit } = {}) {
  if (!TABLES.has(table)) throw new Error(`Unsupported persistence collection: ${table}`);
  const { baseUrl, serviceKey } = assertConfig();
  const params = Object.entries(filters).map(([key, value]) => encodeFilter(FIELD_MAP[key] ?? key, value));
  if (limit) params.push(`limit=${encodeURIComponent(String(limit))}`);
  const url = `${baseUrl}/rest/v1/${table}${params.length ? `?${params.join('&')}` : ''}`;
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    Accept: 'application/json',
    'Accept-Profile': 'allegro_vibez',
    'Content-Profile': 'allegro_vibez'
  };
  if (body !== undefined) {
    headers['content-type'] = 'application/json';
    headers.Prefer = 'return=representation';
  }
  const response = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(mapIn(body)) });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = null; }
  if (!response.ok) {
    const error = new Error(payload?.message || payload?.hint || `Supabase persistence request failed (${response.status})`);
    error.code = response.status === 409 ? 'CONFLICT' : 'PERSISTENCE_ERROR';
    error.status = response.status;
    throw error;
  }
  return Array.isArray(payload) ? payload.map(mapOut) : mapOut(payload);
}

export function createSupabaseRepository() {
  return Object.freeze({
    async create(collection, value) {
      const rows = await request(collection, 'POST', { body: value });
      return Array.isArray(rows) ? rows[0] : rows;
    },
    async get(collection, filters) {
      const rows = await request(collection, 'GET', { filters, limit: 1 });
      return Array.isArray(rows) ? (rows[0] ?? null) : rows;
    },
    async list(collection, filters = {}) {
      const rows = await request(collection, 'GET', { filters });
      return Array.isArray(rows) ? rows : [];
    },
    async update(collection, filters, value) {
      const rows = await request(collection, 'PATCH', { filters, body: value });
      return Array.isArray(rows) ? (rows[0] ?? null) : rows;
    },
    async delete(collection, filters) {
      await request(collection, 'DELETE', { filters });
      return true;
    }
  });
}
