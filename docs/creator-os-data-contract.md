# ALLEGRO-VIBEZ Creator OS — Data Contract

## Purpose

Creator OS is the private catalogue workspace for artists and creators. The browser may use a publishable Supabase key, but all authorization must be enforced by the database/API layer with authenticated-user ownership checks and Row Level Security (RLS).

## Core entities

### Creator identity
- `creator_id`: authenticated user identifier.
- Profile data must be scoped to the authenticated creator.

### Release
Recommended fields:
- `id`
- `creator_id`
- `title`
- `release_type`
- `release_date`
- `artwork_url`
- `label_name`
- `upc`
- `copyright_year`
- `status`
- `created_at`

### Track
Recommended fields:
- `id`
- `release_id`
- `creator_id`
- `track_number`
- `title`
- `version`
- `isrc`
- `duration_seconds`
- `explicit`
- `created_at`

### Release credit / ownership
- `id`
- `release_id`
- `creator_id`
- `name`
- `role`
- `percentage`
- `ipi`
- `pro_name`
- `notes`
- `created_at`

### Track credit / ownership
Same ownership principles as release credits, scoped to `track_id` and authenticated creator ownership.

### Audio asset
- `id`
- `track_id`
- `creator_id`
- `asset_type`
- `status`
- `file_size_bytes`
- `storage_path` or provider reference
- `created_at`

## Security contract

1. Never trust a browser-supplied `creator_id` as proof of ownership.
2. Every release, track, credit and asset query must be scoped to the authenticated user or an authorized collaborator.
3. RLS policies must prevent cross-creator reads, inserts, updates and deletes.
4. Storage objects must use equivalent ownership policies; a public URL must never be treated as authorization.
5. Service-role credentials belong only in server-side infrastructure and must never be shipped to the browser.
6. Publishing/distribution status must remain distinct from catalogue readiness. A readiness check does not mean a release has been distributed or royalties paid.
7. Ownership percentages should be validated as numbers from 0–100; finalization should require a balanced 100% split where the workflow requires ownership completion.

## Lifecycle

`draft → metadata_complete → rights_review → publishing_review → approved → distributed`

Only an actual connected distribution provider may transition a release to `distributed`. Creator OS itself must not claim distribution merely because metadata is complete.

## Integration boundary

Supabase, storage providers, distributors, royalty systems and payment providers are replaceable integrations. ALLEGRO-VIBEZ application logic should depend on this contract rather than provider-specific assumptions.
