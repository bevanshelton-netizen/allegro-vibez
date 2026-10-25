# ALLEGRO-VIBEZ Distribution Gateway v1

The gateway is the trusted execution boundary between Creator OS metadata and external distribution providers.

## Request pipeline

1. Authenticate the creator.
2. Verify release ownership.
3. Load release, tracks, credits and audio metadata server-side.
4. Run readiness and rights validation.
5. Build the canonical deterministic manifest.
6. Hash the canonical request.
7. Enforce creator-scoped idempotency.
8. Resolve the provider adapter from server-side configuration.
9. Execute only the adapter mode that is actually configured.
10. Persist the provider response as an auditable adapter event.
11. Advance delivery state only from verified provider responses.

## Security boundary

The browser may request an operation, but it never receives provider credentials, signing secrets or service-role credentials. Provider authentication and callback verification belong on the trusted server-side runtime.

## State discipline

Job lifecycle:
`queued -> running -> completed|failed|cancelled`

Delivery lifecycle:
`prepared -> submitted -> acknowledged -> delivered`

Terminal failures:
`rejected`, `failed`

A successful HTTP/API transport response alone does **not** mean `delivered`. A provider acknowledgement is required, and final delivery requires provider evidence appropriate to that provider.

## Current operating mode

Until a real provider API and credentials are explicitly configured and successfully tested, ALLEGRO-VIBEZ operates in manual/package mode. The system may prepare manifests and packages but must not claim external DSP distribution, publication, streams, royalties or payouts.
