# ALLEGRO-VIBEZ Distribution Gateway

## Purpose

The Distribution Gateway is the controlled execution boundary between Creator OS release data and external music-distribution providers. It owns orchestration and verification while provider credentials and provider-specific transport remain server-side.

## Execution contract

1. Authenticate the creator and verify release ownership.
2. Validate release readiness and rights metadata.
3. Generate a deterministic release manifest.
4. Hash the manifest and persist a distribution job with an idempotency key.
5. Resolve the selected provider adapter without exposing credentials to the browser.
6. Submit only through an enabled, configured adapter.
7. Persist provider acknowledgement or failure as an adapter event.
8. Update delivery state only from verified adapter responses.
9. Never infer DSP publication, streams, royalties, or payout availability from an internal submission state.

## Job states

`queued -> running -> completed | failed | cancelled`

## Delivery states

The delivery record remains the source of truth for provider interaction status. External publication is considered verified only when a provider returns a durable acknowledgement that can be reconciled to the delivery's external reference.

## Idempotency

Every job requires a creator-scoped idempotency key. Repeating the same request must not create duplicate provider submissions.

## Security boundary

- Browser: publishable Supabase client only.
- Server gateway: provider credentials, signing secrets, API tokens and transport.
- Database: owner-scoped RLS for creator-visible job/delivery state.
- Provider: external distribution execution and acknowledgement.

No service-role or provider secret belongs in frontend source, public repository files, or client-side configuration.

## Current provider posture

No real distributor is marked as connected until credentials and API access have been explicitly configured and a successful test transaction has been verified. The gateway therefore supports safe manifest/package preparation without fabricating delivery results.
