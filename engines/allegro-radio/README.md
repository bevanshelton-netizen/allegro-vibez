# ALLEGRO Radio independent engine

This package establishes an independently deployable broadcast-control runtime
for the existing ALLEGRO-VIBEZ Radio experience at `/radio/`. It is not a new
public website, product identity, artist database, or replacement for Radio API
v9 or the existing operator console.

## Ownership

The engine owns its isolated broadcast queue persistence, eligibility gate,
queue state machine, health endpoint, and capability declaration. It does not
own or duplicate canonical artist identity, signing agreements, catalogue
publication, track rights, audio storage, listener identity, or payments.
Those remain with their authoritative ALLEGRO systems.

## Broadcast eligibility

Every queue item must carry authoritative evidence references and verified
states for all of the following:

1. An active ALLEGRO artist signing agreement.
2. Track-specific broadcast clearance.
3. Published track status.
4. A real, verified audio asset.
5. A timestamped evidence assertion from the authoritative ALLEGRO service.

Any missing, pending, inactive, draft, or unverified condition fails closed.
Generated demos, unapproved submissions, and tracks without verified audio
assets are not eligible. The engine does not create or infer rights. The
evidence fields are assertions from a trusted upstream service, not proof of
cryptographic authenticity; integration must bind the caller to the
authoritative rights service and validate its signed/authorized assertion.

## API

- `GET /healthz`
- `GET /v1/capabilities`
- `POST /v1/queue/validate`
- `POST /v1/queue`
- `GET /v1/queue`
- `GET /v1/queue/{item_id}`
- `POST /v1/queue/{item_id}/state`

Queue states follow a one-way transition: scheduled -> ready -> playing ->
completed. Any non-terminal state may be blocked. Terminal states cannot be
reopened. Exact retries are idempotent; changed payloads cannot reuse an item
identifier.

## Provider and streaming boundary

The engine currently manages broadcast control only. It does not stream audio,
start a simulcast, or claim a broadcast is live. Streaming, CDN, transcoding,
and simulcast providers must be replaceable adapters behind an explicit
integration contract; no provider is selected or required by this package.

## Security and rollout gates

- Private-network only. Do not expose this service publicly.
- FORTRESS authentication, role authorization, tenant/environment scoping,
  signed evidence verification, rate limits, and audit integration are
  mandatory before operator or upstream-service access is enabled.
- Connect to existing Radio API v9 and operator console only through a reviewed
  compatibility adapter. Do not replace or migrate existing Radio/Supabase
  records as part of this engine package.
- Persist data on a dedicated volume; validate backup/restore and rollback.
- Register the runtime only after a verified, authorized HOST execution
  environment exists. NODE01 is software, not a host.
- Verify real stream, simulcast and listener playback before any live claim.

## Local checks

```sh
python -m unittest -v
docker build -t allegro-radio-engine:local .
```

This source package does not constitute a production deployment or a live
radio service.
