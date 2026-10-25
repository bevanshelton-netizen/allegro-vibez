# Provider Adapter Implementation Template

Use this template when a real distributor, DSP or rights provider is approved for integration.

## Adapter metadata

```text
adapter_key:
provider_name:
environment: sandbox | production
contract_scope:
api_version:
credential_reference:
```

## Required operations

### `validate(manifest)`

Validate the internal canonical release manifest against provider-specific requirements. Return structured validation errors. Do not submit anything.

### `prepare(manifest)`

Map the internal manifest into the provider request format. Produce a deterministic request hash. Never expose credentials.

### `submit(prepared_request, idempotency_key)`

Execute the server-side provider request. Capture the raw provider response securely enough to audit the transaction without storing secrets. Return the normalized adapter result.

### `verify(provider_response)`

Confirm that the response is structurally valid and contains the provider acknowledgement or explicit failure state expected by the contract.

## Normalized result

```json
{
  "provider_submission_id": null,
  "status": "pending",
  "acknowledged_at": null,
  "request_hash": "sha256:...",
  "response_hash": "sha256:...",
  "provider_message": "",
  "external_delivery_performed": false
}
```

`external_delivery_performed` must be explicitly established from the provider interaction. It must never be inferred from an internal job status.

## Verification checklist

- [ ] Provider contract and commercial scope approved
- [ ] Sandbox/test credentials obtained through a secure secret store
- [ ] Provider schema mapped
- [ ] Required metadata and rights rules mapped
- [ ] Server-side transport implemented
- [ ] Timeout/retry policy defined
- [ ] Idempotency/reconciliation strategy defined
- [ ] Test transaction completed
- [ ] Provider acknowledgement verified
- [ ] Failure responses tested
- [ ] Audit event persisted
- [ ] Browser cannot access secrets
- [ ] Internal status cannot be mistaken for provider acceptance
- [ ] Production enablement explicitly approved
