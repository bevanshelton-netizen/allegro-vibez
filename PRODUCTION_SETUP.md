# ALLEGRO-VIBEZ production activation

## Architecture

The public React/Vite frontend remains on Netlify from GitHub `main`. **IZAKHONO Core is the target owner-controlled runtime**, while the current application still contains a Supabase compatibility path for existing authentication/data/Edge Function flows. Do not claim the Core cutover complete until the public Core route and protected adapters have passed the acceptance tests below.

Production frontend origin:

`https://allegro-vibez.netlify.app`

The frontend requires three browser-safe values:

- `VITE_IZAKHONO_CORE_URL`
- `VITE_IZAKHONO_PROJECT=allegro-vibez`
- `VITE_IZAKHONO_PUBLIC_KEY=ik_pub_...`

Never place an `ik_sec_*` key, the Core root-admin key, database password, PayFast merchant key/passphrase or any other server credential in the Vite build.

## Zero-Cost Host Mode

No paid VPS is required for the first self-hosted environment. IZAKHONO CLOUD Zero-Cost Host Mode v1.0 runs Core, PostgreSQL, storage, the application control plane, deployment runner, backups and Owner Console on an existing Docker-capable computer.

Local Core URL:

`http://127.0.0.1:8787`

This loopback URL is for software running on the host computer. **Do not put it into the public Netlify production environment.** Public visitors need a stable HTTPS Core URL routed to that same computer, using an existing public network route or a free encrypted tunnel.

## Provision ALLEGRO

Use the reviewed IZAKHONO owner-host tooling. The Core project identifier is **`allegro-vibez`**.

On the owner host, provision the Core project with signup enabled:

```bash
sudo /opt/izakhono/bin/provision-core-project.sh allegro-vibez --allow-signup
```

Keep the generated owner-only project record private. Only the returned browser-safe public project key belongs in `VITE_IZAKHONO_PUBLIC_KEY`.

The ALLEGRO repository's `izakhono/manifest.json`, `schema.sql` and `seed.sql` remain the reviewed application data contract. Do not claim the Core cutover complete until those tables/policies and the private `release_assets` bucket have been provisioned and the acceptance tests below pass.

## Data and creator acceptance

Before public routing cutover, verify on the actual Core host:

1. `/healthz` and `/readyz` return healthy.
2. New creator signup/signin works and sessions persist.
3. Creator profile data is owner-protected while `public_profiles` remains publicly readable.
4. Private releases stay owner-only and only `published_releases` appears publicly.
5. Artwork/audio upload and download work from the private bucket.
6. A second creator cannot read or overwrite another creator's private media.
7. Rights/contributor records remain owner-only.
8. Royalty, subscription, wallet and payout rows remain owner-only.
9. A payout request cannot exceed the server-validated withdrawable balance.
10. Backup creation and restore proof complete successfully.

## Protected operations

The Core browser adapter intentionally does not emulate privileged operations in the browser. Before full transactional launch, add and validate protected IZAKHONO-hosted services for:

- release moderation / publish decisions
- payout administration and finalisation
- PayFast checkout creation
- PayFast notification validation and idempotent subscription activation
- password recovery / email delivery

PayFast credentials must remain server-side. Keep live payment processing disabled until a complete sandbox checkout, validated notification, replay/idempotency and subscription-activation test passes.

## Public cutover

Only after the Core host has a stable public HTTPS route:

1. Put the public Core URL and `ik_pub_*` project key in Netlify production variables.
2. Deploy the exact tested commit.
3. Test Home, Discover, Artists, Join and Login from a device that is **not** the Core host.
4. Run creator signup, private upload, discovery and owner-isolation tests again over the public route.
5. Verify security headers, Terms, Privacy and direct SPA navigation.
6. Activate protected payment/admin services only after their server-side gates pass.

The host computer must remain powered on and internet-connected for a workstation-hosted public service to remain available.


## ALLEGRO ↔ KORA screen integration

Browser-safe frontend variable:

- `VITE_KORA_URL` — the public KORA origin used only to open the creator-link page.

Server-only handoff values:

- `KORA_INTERNAL_URL` — KORA HTTPS origin used by the server adapter;
- `ALLEGRO_KORA_INTEGRATION_KEY` — shared secret used only server-to-server.

The integration secret must never be present in the Vite bundle.

Current compatibility implementation uses the `kora-video-handoff` server/Edge Function. When ALLEGRO protected operations move fully to IZAKHONO Core, the same contract should be implemented by the Creator OS `media_handoff` module without changing the browser workflow.

Acceptance test:

1. Artist logs into ALLEGRO and copies their Creator Code.
2. Same artist logs into KORA Creator Studio and links the code.
3. Artist creates a rights-declared project in ALLEGRO Screen Studio.
4. KORA creates a **draft**, not a public production.
5. KORA returns a secure upload allocation.
6. Moderation/rights state remains pending/review until evidence is approved.
7. No secret appears in browser network payloads or built assets.
