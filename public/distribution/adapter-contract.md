# ALLEGRO-VIBEZ Distribution Adapter Contract

## Purpose
Provider adapters translate a validated ALLEGRO-VIBEZ release manifest into a provider-specific submission without exposing provider secrets to the browser.

## Lifecycle
`prepared -> submitted -> acknowledged -> delivered`

Failure states: `rejected`, `failed`.

## Adapter interface

```text
validate(manifest) -> validation result
prepare(manifest) -> provider package / request descriptor
submit(prepared) -> submission result
normalizeCallback(payload) -> normalized event
```

Adapters MUST:
- accept only manifests that pass local readiness validation;
- keep credentials server-side;
- return provider references when actually supplied by the provider;
- record normalized events in the distribution event log;
- never fabricate acknowledgement, delivery, royalty, or DSP availability;
- preserve an auditable relationship between release, delivery, provider and external reference.

Adapters MUST NOT:
- contain service-role credentials in client code;
- mark a delivery as delivered solely because an API request succeeded;
- represent a package as distributed without provider confirmation;
- silently mutate rights, ownership or split percentages.

## Initial provider modes

### Manual
Generate a verified manifest/package descriptor for an operator to submit externally.

### API
Reserved for providers with documented APIs and approved credentials.

### Package
Generate a standards-oriented delivery package for a compatible distributor or ingestion workflow.

## Security boundary
The Creator OS browser is responsible for authenticated user interaction and owner-scoped metadata. Provider authentication, signing, callback verification and secret handling belong on a trusted server-side boundary.

Until a real provider credential and API contract are configured, ALLEGRO-VIBEZ remains in **manual/package mode** and must not claim external distribution.
