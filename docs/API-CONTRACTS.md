# ALLEGRO-VIBEZ Production API Contracts

## Purpose

This document defines the first stable server boundary for ALLEGRO-VIBEZ. The browser may use demo/local state, but production identity, media, rights, earnings, payments, community and commerce must cross authenticated server APIs.

## Rules

- JSON over HTTPS.
- Authentication is server-issued; no private credentials in browser code.
- Every mutating request requires an authenticated actor and server-side authorization.
- Financial and rights mutations are idempotent and auditable.
- Uploads use short-lived signed upload URLs; media processing is asynchronous.
- Payment status is derived from verified provider callbacks/server queries, never browser claims.
- API responses expose explicit state; `pending` is never represented as `paid`, `published`, `distributed`, or `settled`.
- All timestamps are ISO 8601 UTC.

## Identity

`POST /api/v1/auth/register`

Creates a pending account. Production implementation must verify email and apply abuse/rate controls.

`POST /api/v1/auth/login`

Authenticates an account and returns a short-lived session/access credential.

`GET /api/v1/me`

Returns the authenticated profile and roles.

## Artists

`POST /api/v1/artists`

Creates an artist profile owned by the authenticated account.

`GET /api/v1/artists/:id`

Returns public artist information.

`PATCH /api/v1/artists/:id`

Updates an artist profile after ownership authorization.

## Releases & Media

`POST /api/v1/releases`

Creates a release in `draft` state.

`POST /api/v1/releases/:id/assets/upload-url`

Returns a short-lived upload destination for an authorized owner.

`POST /api/v1/releases/:id/submit`

Moves a complete release from `draft` to `submitted` after server validation.

`GET /api/v1/releases/:id`

Returns release metadata and state.

## Rights

`PUT /api/v1/releases/:id/splits`

Replaces contributor splits. The server must require a valid total of exactly 100% and preserve an immutable audit record of accepted versions.

`GET /api/v1/releases/:id/splits`

Returns the currently accepted split version.

## Earnings & Payments

`GET /api/v1/earnings`

Returns ledger-derived balances and transactions for the authenticated creator.

`POST /api/v1/payouts`

Creates a payout request only when the creator is eligible and the available balance is sufficient.

`GET /api/v1/payments/:id`

Returns payment state such as `pending`, `authorized`, `paid`, `failed`, or `refunded` based on verified server-side evidence.

Provider webhooks must be authenticated, idempotent and recorded before financial state changes are committed.

## Commerce

`POST /api/v1/orders`

Creates an order from server-priced products. Client-supplied totals are advisory only.

`POST /api/v1/orders/:id/checkout`

Creates a payment attempt through the configured merchant adapter.

`GET /api/v1/orders/:id`

Returns order and fulfillment state.

## Community

`GET /api/v1/community/feed`

Returns moderated, authorized feed content.

`POST /api/v1/community/posts`

Creates a post subject to validation, rate limits and moderation policy.

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

Common codes: `UNAUTHENTICATED`, `FORBIDDEN`, `VALIDATION_ERROR`, `CONFLICT`, `NOT_FOUND`, `RATE_LIMITED`, `PAYMENT_PENDING`, `PROVIDER_UNAVAILABLE`, `INTERNAL_ERROR`.

## Production Gate

An endpoint is not considered live merely because its route exists. A production endpoint requires authenticated access, secure credentials, real external response where applicable, successful end-to-end testing, failure/retry testing, audit/reconciliation evidence and monitoring/rollback coverage.
