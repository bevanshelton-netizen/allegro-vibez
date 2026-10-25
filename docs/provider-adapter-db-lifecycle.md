# Provider Adapter Database Lifecycle

Creator OS stores provider adapter readiness separately from delivery success.

## Lifecycle

`NOT_CONFIGURED → CONFIGURED → TESTING → VERIFIED → ENABLED`

The database lifecycle is descriptive state. It is not proof of an external submission, publication, streams, royalties, or payout.

## Provider record

`creator_distribution_providers` contains the provider identity and adapter boundary:

- `provider_name`
- `provider_key`
- `adapter_version`
- `mode`
- `enabled`
- `credentials_configured`
- `adapter_status`
- `last_verified_at`
- `test_transaction_reference`

Credentials and secrets are never stored in this table or exposed to the browser. `credentials_configured` is only a readiness signal.

## Activation gates

- `CONFIGURED`: provider contract and schema mapping exist; credentials may be configured server-side.
- `TESTING`: a controlled provider test is in progress.
- `VERIFIED`: a real test transaction produced a provider acknowledgement that was independently verified.
- `ENABLED`: production use is explicitly approved after verification.

`ENABLED` must not be set merely because an adapter exists, credentials are present, or an internal job completed.

## Current safe baseline

Manual Package remains the only ready delivery path until a real external provider is selected, contracted, credentialed server-side, tested, and independently acknowledged.
