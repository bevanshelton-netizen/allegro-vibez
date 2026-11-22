# ALLEGRO-VIBEZ Independent Engine

Version: 1.0.0  
Status: Built in source; deployment and public integration remain unverified.

This service is ALLEGRO-VIBEZ's independently deployable domain engine for catalogue release validation, release-readiness decisions and immutable release records. It is not a shared portfolio engine and does not depend on Allegro Radio or another product's runtime.

## Owned responsibilities

- Validate required release metadata, audio/artwork references, territory-rights confirmation and contributor-split confirmation.
- Persist accepted release records in its own SQLite database.
- Make release creation idempotent for an exact retry.
- Reject attempts to overwrite an existing release ID with changed content; a changed release must use a new versioned release ID.
- Expose health and capability contracts.

Digital service providers remain replaceable distribution adapters. This initial engine deliberately does not dispatch music to a distributor, stream audio, calculate royalties or claim a release is live at a DSP.

## HTTP contract

- `GET /healthz` — process and database health.
- `GET /v1/capabilities` — supported capabilities and privacy declarations.
- `POST /v1/releases/validate` — deterministic readiness validation.
- `POST /v1/releases` — validate and persist an immutable release record.
- `GET /v1/releases/{release_id}` — retrieve a stored release record.

A release requires non-empty `release_id`, `title`, `primary_artist_id`, `audio_asset_ref`, `artwork_asset_ref`, and explicit true values for `metadata_complete`, `territory_rights_confirmed` and `contributor_splits_confirmed`.

## Run locally

```sh
python -m unittest -v
ALLEGRO_DATA_DIR=./data python engine.py
```

The service listens on port 8787 by default.

## Container

Build from this directory:

```sh
docker build -t izakhono/allegro-vibez-engine:1.0.0 .
docker run --rm -p 8787:8787 -v allegro-vibez-engine-data:/var/lib/allegro-engine izakhono/allegro-vibez-engine:1.0.0
```

The database volume is persistent and must be included in the platform's backup and restore policy.

## Security and privacy boundary

This first engine release has no login/session layer and must remain on a private service network behind the approved FORTRESS authentication and authorization boundary. Do not expose port 8787 directly to the public internet. Do not connect production artist/customer data until tenant and role authorization, secrets handling, backup/restore and audit integration have been verified.

The engine emits no behavioural tracking, profiling, advertising signals or silent analytics. Its HTTP request logger is disabled. Operational health is limited to service and database readiness.

## Integration boundary

The existing ALLEGRO public website, Creator OS and artist identity remain canonical. Integrate this service through a narrowly scoped internal adapter only after API authentication, data ownership, migration and rollback are approved. Existing Supabase services and all verified external public routes remain unchanged until end-to-end replacement gates pass.

## Completion status

- Source package: added.
- Unit tests: included; execution evidence must be recorded by CI.
- Container build: defined; build evidence pending.
- Private runtime registration: pending.
- FORTRESS authorization and tenant isolation: pending.
- Backup/restore and rollback drill: pending.
- Public integration or DNS cutover: not performed.
