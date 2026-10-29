# ALLEGRO-VIBEZ Production API Contracts

## Purpose

This document defines the first stable server boundary for ALLEGRO-VIBEZ. The browser may use demo/local state, but production identity, media, rights, earnings, payments, community and commerce must cross authenticated server APIs.

## Rules

- JSON over HTTPS.
- Authentication is server-issued; no private credentials in browser code.
- Every mutating user request requires an authenticated actor and server-side authorization.
- Financial and rights mutations are idempotent and auditable.
- Uploads use short-lived signed upload URLs; media processing is asynchronous.
- Payment status is derived from verified provider callbacks/server queries, never browser claims.
- API responses expose explicit state; `pending` is never represented as `paid`, `published`, `distributed`, or `settled`.
- All timestamps are ISO 8601 UTC.

## Identity

`POST /api/v1/auth/register`

Creates an account. Production implementation must verify email and apply abuse/rate controls.

`POST /api/v1/auth/login`

Authenticates an account and returns a session/access credential.

`GET /api/v1/me`

Returns the authenticated profile and roles.

## Artists

`POST /api/v1/artists`

Creates an artist profile owned by the authenticated account.

`GET /api/v1/artists/:id`

Returns public artist information.

`PATCH /api/v1/artists/:id`

Updates an artist profile after ownership authorization.

## Social Graph

`POST /api/v1/users/:id/follow`

Follows another user. Self-follow is rejected and repeat follows are idempotent.

`DELETE /api/v1/users/:id/follow`

Removes the authenticated user's follow relationship.

`GET /api/v1/social/following`

Returns the authenticated user's following relationships, newest-first, capped server-side.

`GET /api/v1/social/followers`

Returns the authenticated user's followers, newest-first, capped server-side.

## Direct Messaging

`POST /api/v1/conversations`

Creates or reuses a direct conversation between the authenticated account and another account.

`GET /api/v1/conversations`

Returns conversations in which the authenticated account is a member, ordered by most recently updated.

`GET /api/v1/conversations/:id/messages`

Returns messages only when the authenticated account is a conversation member. Deleted messages are omitted.

`POST /api/v1/conversations/:id/messages`

Sends a message only when the authenticated account is a conversation member. Message text is capped at 4,000 characters.

`DELETE /api/v1/messages/:id`

Soft-deletes a message only when the authenticated account is its sender.

## Releases & Media

`POST /api/v1/releases`

Creates a release in `DRAFT` state.

`POST /api/v1/releases/:id/assets/upload-url`

Reserved production boundary for a short-lived signed upload destination.

`POST /api/v1/releases/:id/submit`

Moves a complete release from draft to submitted only after server validation and rights readiness.

`GET /api/v1/releases/:id`

Returns release metadata and state.

## Rights

`PUT /api/v1/releases/:id/splits`

Replaces contributor splits. The server requires a valid total of exactly 100% and preserves auditability.

`GET /api/v1/releases/:id/splits`

Returns the currently accepted split version.

## Earnings

`GET /api/v1/earnings`

Returns ledger-derived balances and transactions for the authenticated creator.

`POST /api/v1/earnings/payouts`

Creates a payout request only when the creator is eligible and available balance is sufficient.

## Commerce & Payments

`POST /api/v1/orders`

Creates an order and a `PENDING` payment attempt. An idempotency key is mandatory. Payment-provider credentials are never accepted from the browser.

`GET /api/v1/orders/:id`

Returns the authenticated user's order and its current payment state.

`POST /api/v1/payments/:id/verify`

Internal reconciliation boundary. It is disabled unless `ALLEGRO_PAYMENT_RECONCILIATION_SECRET` is configured and must only be called by a trusted provider adapter/reconciliation worker. A verified payment transitions the payment to `VERIFIED`, the order to `PAID`, and posts one idempotent ledger capture.

The initial order path is provider-agnostic and defaults to the preferred `iKhokha` provider name, but this does **not** mean an iKhokha merchant integration is live. Live provider operation requires real merchant credentials, authenticated callbacks/provider queries, reconciliation and end-to-end verification.

Provider callbacks must be authenticated, idempotent and recorded before financial state changes are committed.

## Community

`GET /api/v1/community/feed`

Returns published community posts newest-first, capped by a server-side maximum.

`POST /api/v1/community/posts`

Creates an authenticated community post. Body text is validated server-side and capped at 4,000 characters. New posts enter `PUBLISHED` state in the current foundation; production moderation can transition them to hidden/review states before broader launch.

`DELETE /api/v1/community/posts/:id`

Deletes a post only when the authenticated user owns it. This endpoint is intentionally separate from financial/audit deletion rules.

## Distribution

`POST /api/v1/releases/:id/distribution`

Creates a distribution request only after ownership, metadata and rights checks pass.

`GET /api/v1/distribution/:id`

Returns provider-independent distribution state. Provider adapters remain implementation details and are never exposed as the product architecture.

## Error Contract

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "A human-readable explanation",
    "request_id": "req_..."
  }
}
```

Common codes: `UNAUTHORIZED`, `FORBIDDEN`, `INVALID_REQUEST`, `CONFLICT`, `NOT_FOUND`, `PAYMENT_PENDING`, `PROVIDER_UNAVAILABLE`, `NOT_CONFIGURED`, `INTERNAL_ERROR`.

## Production Gate

An endpoint is not considered live merely because its route exists. A production endpoint requires authenticated access, secure credentials, real external response where applicable, successful end-to-end testing, failure/retry testing, audit/reconciliation evidence and monitoring/rollback coverage.
