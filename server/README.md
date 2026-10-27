# ALLEGRO-VIBEZ Service Boundary

This directory reserves the portable server boundary for the production platform.

The clean rebuild intentionally does not embed credentials, payment secrets, database passwords, provider SDK keys or production identity logic in the browser.

## Required production modules

- `identity` — accounts, sessions, roles and verification
- `artists` — profiles and ownership
- `catalogue` — releases, tracks and metadata
- `media` — signed uploads, validation, transcoding and delivery
- `rights` — contributor ownership and immutable split history
- `ledger` — earnings, adjustments and reconciliation
- `payments` — merchant-provider adapter and verified callbacks
- `community` — posts, moderation and abuse controls
- `commerce` — products, orders and fulfilment
- `distribution` — provider-independent delivery orchestration
- `audit` — security and business event trail

## Adapter rule

Domain services must not depend directly on a specific hosting vendor. Infrastructure adapters can be replaced without rewriting product logic.

## Current status

Architecture boundary defined. Production service is **not claimed live** until deployed with real credentials, persistent storage, authenticated access and end-to-end verification.
