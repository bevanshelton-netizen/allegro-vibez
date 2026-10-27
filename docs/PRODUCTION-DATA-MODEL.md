# ALLEGRO-VIBEZ — Production Data Model

This document defines the smallest production model required to move the clean rebuild from local demo state to a real artist-prosperity platform.

## Core entities

- `users` — identity, account status, locale, consent timestamps.
- `artist_profiles` — artist identity, biography, territory, genres, verification state.
- `releases` — release metadata, status, artwork reference, media references, ownership snapshot.
- `tracks` — track metadata, audio asset reference, ISRC/identifier fields when available.
- `contributors` — people/entities credited to a work.
- `rights_splits` — contributor percentages with server-side total validation and immutable audit history.
- `playlists` — owner, title, visibility, ordered track references.
- `follows` — follower/followed relationships with abuse controls.
- `community_posts` — author, body, moderation state, timestamps.
- `earnings_ledger` — append-only earning events, source, currency, amount, status, reconciliation reference.
- `payout_accounts` — provider reference only; never store raw payment credentials in the application database.
- `orders` — marketplace order state, totals, currency, fulfilment state and payment reference.
- `audit_events` — security, rights, payment and administrative actions.

## State rules

1. Identity and authorization are server-controlled.
2. Rights splits must be validated server-side and versioned; client calculators are advisory only.
3. Financial records are append-only or compensating-entry based; do not silently overwrite ledger history.
4. Payment state is confirmed from the payment provider/server response, never from browser claims.
5. Media assets are private by default until publishing policy explicitly makes them public.
6. User-generated content is untrusted input and must be validated, rate-limited and moderated as appropriate.
7. Every production integration gets an auditable provider reference and failure/retry state.
8. Data export and deletion must be designed into the account model from the beginning.

## Production transition

The current clean rebuild intentionally stores demo state in browser `localStorage`. A production backend must replace that state through explicit API contracts without changing the public product concepts. No live account, royalty, payment, custody or distribution claim should be made until the corresponding server-side integration has passed the production gate defined in `docs/PRODUCTION-INTEGRATION-MAP.md`.
