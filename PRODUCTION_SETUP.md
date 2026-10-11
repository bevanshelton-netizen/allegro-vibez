# ALLEGRO-VIBEZ production activation

## Architecture

ALLEGRO-VIBEZ is an IZAKHONO-owned-first product. The canonical public frontend origin is `https://allegrovibez.com`. The primary runtime target is the IZAKHONO APP FABRIC / NODE01 stack; Vercel, Netlify and other hosted deployments are resilience fallbacks only.

The owned web runtime is published as:

`ghcr.io/bevanshelton-netizen/allegro-vibez-web:production-master`

The owned application core runs separately in the APP FABRIC topology as `izakhono-allegro-core` on port 8788. The web container exposes port 8080 and is intended to sit behind the owner-controlled edge.

## Browser configuration

Preferred production values:

- `VITE_IZAKHONO_CORE_URL` — stable public HTTPS URL for the owned Core runtime when Core-backed browser operations are enabled.
- `VITE_IZAKHONO_PROJECT=allegro-vibez`
- `VITE_IZAKHONO_PUBLIC_KEY=ik_pub_...`

Never place an `ik_sec_*` key, Core root-admin key, database password or payment credential in the Vite bundle.

Until a verified public Core route is configured, the frontend retains its compatibility backend path. This is a resilience fallback, not the owned production target.

## Owned runtime activation

On NODE01, the reviewed APP FABRIC runtime is the source of truth:

```bash
sudo /opt/izakhono/bin/activate-node01.sh
sudo /opt/izakhono/bin/verify-node01.sh
```

The runtime must prove healthy CRM, Revenue, Tasks, FLOW, APP FABRIC Gateway, Allegro Core and the owned Allegro web container before public promotion.

The Allegro web image must pass `/healthz`, the root ALLEGRO marker and the `/radio` route contract before it is considered releasable.

## Public edge

The public hostname is `allegrovibez.com`. Public activation is a separate edge/DNS gate. Use the owner-controlled `prepare-edge.sh` flow only after DNS points the approved hostname to the NODE01-controlled edge:

```bash
sudo /opt/izakhono/bin/prepare-edge.sh allegrovibez.com <allowed-origins> --apply
```

The edge must prove HTTPS `/health` before the site is marked publicly connected. Do not claim a public cutover from a container health result alone.

## Data and creator acceptance

Before full public promotion, verify on the actual owned Core host:

1. Core `/healthz` and `/readyz` are healthy.
2. Creator signup/signin and session persistence work.
3. Creator profile data is owner-protected while public profiles expose only intended fields.
4. Private releases remain owner-only and published releases are the only public release surface.
5. Artwork/audio upload and download work through the intended private storage path.
6. Cross-account private-media reads and overwrites are denied.
7. Rights/contributor records remain owner-scoped.
8. Royalty, subscription, wallet and payout rows remain owner-scoped.
9. Payout validation is enforced server-side.
10. Backup and isolated restore proof succeeds.

## Protected operations

The browser adapter must not emulate privileged operations. Keep these server-side and disabled until their acceptance tests are green:

- release moderation/publishing
- payout administration/finalisation
- payment checkout creation
- payment notification validation and idempotent activation
- password recovery/email delivery

## Release gate

A release is eligible for public promotion only when:

- the Allegro web image is published and passes its container smoke test;
- APP FABRIC core services are healthy;
- Allegro Core health and persistence contracts pass;
- the IZAKHONO ONE → FLOW bridge passes;
- the public edge HTTPS health check passes;
- the exact production commit passes `npm run verify:all`;
- protected payment/admin/recovery services have their own acceptance gates.

Vercel/Netlify may remain available as emergency fallback deployments, but their availability or build limits must never be treated as the health signal for the owned Allegro runtime.

## ALLEGRO ↔ KORA integration

Browser-safe frontend variable:

- `VITE_KORA_URL` — public KORA origin used only to open the creator linking page.

Server-only values:

- `KORA_INTERNAL_URL`
- `ALLEGRO_KORA_INTEGRATION_KEY`

The integration secret must never enter the Vite bundle. The handoff remains draft/moderation-gated until rights and evidence are approved.
