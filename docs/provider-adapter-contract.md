# Provider Adapter Contract

## Purpose

Define the server-side contract required before ALLEGRO-VIBEZ Creator OS can submit a verified release to an external distributor, DSP, or rights/royalty provider.

This document is an integration boundary, not evidence that any external provider is connected.

## Adapter lifecycle

`NOT_CONFIGURED → CONFIGURED → TESTING → VERIFIED → ENABLED`

A provider must not enter `ENABLED` until all activation gates pass.

## Activation gates

1. **Provider identity** — provider name, adapter key, environment and contractual scope are recorded.
2. **Credential boundary** — credentials/API tokens/signing secrets exist only in trusted server-side infrastructure. Never store them in browser code, public HTML, logs, or client-visible tables.
3. **Schema mapping** — the provider's required metadata, identifiers, credits, rights and asset requirements are mapped to the internal release manifest.
4. **Transport** — a server-side adapter can make the provider request without exposing credentials to the creator client.
5. **Test transaction** — a non-production or provider-approved test submission is executed where supported.
6. **Verified acknowledgement** — the provider response is independently captured and validated against the expected response contract.
7. **Idempotency** — retries cannot create duplicate provider submissions when the provider supports an idempotency key or equivalent reconciliation mechanism.
8. **Audit trail** — request/result hashes, provider acknowledgement identifiers, timestamps and adapter events are persisted without storing secrets.

## Canonical adapter result

An adapter should normalize its provider response into a trusted internal result containing:

- `provider_id`
- `provider_submission_id` when supplied
- `status` (`accepted`, `rejected`, `pending`, `failed`)
- `acknowledged_at`
- `request_hash`
- `response_hash`
- `provider_message`
- `external_delivery_performed` — explicit boolean, never inferred

The normalized result must distinguish an external provider acknowledgement from internal workflow completion.

## Security boundary

Browser code may request a distribution job and display trusted results. Browser code must never resolve provider credentials, signing keys, private API endpoints, or secret transport configuration.

The database gateway remains the current trusted internal preparation path. A future server-side provider adapter may consume its verified manifest, but must not mark a release as externally accepted merely because an internal job completed.

## No-fake-status rule

The system must never infer:

- DSP publication from package generation;
- distributor acceptance from a queued/running/completed internal job;
- streams from delivery;
- royalties from streams;
- payouts from royalty records;
- provider connection from a configured database row alone.

Only a verified external provider response may establish an external submission/acknowledgement state.

## First integration boundary

The first production provider adapter should be implemented only after a real provider is selected and its commercial/API credentials and test access are available. Until then, the Manual Package adapter remains the only `READY` path.
