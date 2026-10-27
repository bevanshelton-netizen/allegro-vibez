# ALLEGRO-VIBEZ Persistent Data Model

The clean rebuild uses a portable relational model. Hosting, database vendor and payment provider are implementation choices; domain records remain portable.

## Core identity

- `users`: id, email, password_hash, display_name, role, status, created_at, updated_at
- `sessions`: id, user_id, token_hash, expires_at, revoked_at, created_at
- `artists`: id, user_id, stage_name, bio, country, city, avatar_url, status, created_at, updated_at

## Music

- `releases`: id, artist_id, title, release_type, genre, status, artwork_url, release_date, created_at, updated_at
- `tracks`: id, release_id, title, duration_ms, sequence, audio_asset_id, status, created_at, updated_at
- `rights_splits`: id, release_id, party_id, party_type, share_percent, role, verified_at, created_at

## Money and commerce

- `ledger_entries`: id, account_id, entry_type, amount_minor, currency, reference_type, reference_id, status, occurred_at, created_at
- `payments`: id, order_id, provider, provider_reference, amount_minor, currency, status, verified_at, created_at, updated_at
- `payouts`: id, user_id, amount_minor, currency, status, provider_reference, requested_at, completed_at
- `orders`: id, user_id, currency, subtotal_minor, total_minor, payment_id, status, created_at, updated_at

## Community and distribution

- `community_posts`: id, author_id, body, status, created_at, updated_at
- `distribution_jobs`: id, release_id, target, status, provider_reference, submitted_at, delivered_at, failure_code
- `audit_events`: id, actor_id, action, entity_type, entity_id, request_id, metadata_json, created_at

## Required invariants

1. User email is unique after normalization.
2. Password hashes are never returned by API responses.
3. Session tokens are never stored in plaintext; production persistence stores a token hash.
4. Rights splits for a release must total exactly 100% before submission.
5. Money is stored in integer minor units with an explicit ISO currency.
6. Financial mutations are append-only ledger events with idempotency keys.
7. Payment status changes only from verified provider state or authorized server-side reconciliation.
8. Release, payment, payout and distribution state transitions are explicit and auditable.
9. User-generated content is treated as untrusted input.
10. Production records require timestamps and auditability.

## Production gate

A schema is not a production service by itself. ALLEGRO-VIBEZ must have a configured persistent store, secure credentials, authenticated access, migrations, backup/recovery, monitoring, reconciliation and end-to-end tests before the API is labelled live.
