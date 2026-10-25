# ALLEGRO-VIBEZ Distribution Engine

The distribution layer separates creator metadata preparation from external distributor/DSP delivery.

## Current capability
- Deterministic release manifest generation.
- Metadata readiness validation.
- Explicit separation between `ready`, `submitted`, `acknowledged`, and `delivered` states.
- No provider credentials or fake external delivery claims.

## Next adapter contract
A provider adapter must accept a validated manifest and return a provider reference plus an explicit acknowledgement state. Credentials must be stored server-side and never exposed to the browser.
