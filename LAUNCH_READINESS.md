# ALLEGRO-VIBEZ Launch Readiness

## Release status

ALLEGRO-VIBEZ is a Vite/React single-page application prepared for the Netlify frontend and an IZAKHONO Core backend. The source now uses the IZAKHONO Core compatibility client; a Supabase browser client is no longer instantiated.

The GitHub launch gate verifies the IZAKHONO runtime contract, linting, publishing structure, frontend secret boundaries and the production Vite build. Public promotion remains gated on a real Core host and end-to-end acceptance.

## Production capabilities already represented in source

- Creator signup/signin and persisted Core sessions
- Creator profiles and safe public artist discovery
- Private release upload, artwork/audio storage and creator catalogues
- Release submission flow and rights/contributor records
- Royalty ledger, creator wallet and payout-request UI
- Subscription-plan catalogue
- Public Terms of Use and Privacy Notice
- SEO/social metadata, robots and sitemap
- Netlify SPA routing/security configuration
- IZAKHONO Core project manifest, schema, seed and exposure policies
- Private storage owner enforcement when Core v0.3.1+ is used
- GitHub Actions launch gate

## Capabilities that still require protected server activation

These must not be represented as live merely because the UI exists:

- administrator release moderation / publishing
- payout administration and finalisation
- PayFast checkout creation and notification processing
- password-reset email delivery and password-recovery completion

The browser client deliberately refuses privileged server operations until their IZAKHONO-hosted implementations are active.

## Required IZAKHONO Core activation

Use IZAKHONO Core v0.3.1 or newer and provision `izakhono/manifest.json`. In Zero-Cost Host Mode, the package's ALLEGRO helper performs this provisioning automatically and records the one-time keys.

The browser build requires:

- `VITE_IZAKHONO_CORE_URL`
- `VITE_IZAKHONO_PROJECT=allegro_vibez`
- `VITE_IZAKHONO_PUBLIC_KEY=ik_pub_...`

Only the `ik_pub_*` key belongs in the frontend. `ik_sec_*`, root-admin, database and payment credentials remain server-side.

## Zero-Cost Host Mode

A paid VPS is not required for the first host. An existing Docker-capable computer can run IZAKHONO CLOUD Zero-Cost Host Mode v1.0.

Local host URL:

`http://127.0.0.1:8787`

This is suitable for tests made on the host computer. It is **not** a valid backend URL for public Netlify visitors. Before public launch, create a stable HTTPS route to the host using an existing public connection or a free encrypted tunnel and repeat the launch acceptance tests through that public route.

## Publication gate

Before marketing ALLEGRO as publicly operational, confirm:

- Core `/healthz` and `/readyz` pass on the actual host.
- The `allegro_vibez` manifest provisions successfully and one-time keys are captured securely.
- A new creator can sign up, sign in and retain a session.
- A creator can save a release and upload private audio/artwork.
- Cross-account private-media reads and overwrites are denied.
- Creator rights/contributor data stays isolated.
- Public artist/release views contain only intended public fields/content.
- Royalty/wallet/payout data stays isolated to the correct creator.
- Payout balance validation is enforced server-side.
- A backup can be created and restored successfully.
- A stable public HTTPS Core route exists and is reachable from outside the host machine.
- Netlify contains the public Core URL/project/public-key values.
- `npm run verify:all` passes on the exact production commit.
- The Netlify frontend deploy succeeds.
- Protected moderation, payment, payout-admin and password-recovery services have their own green acceptance tests before being enabled.

## Current engineering state

The application source is IZAKHONO-Core-ready and the no-paid-VPS host package exists. The remaining launch proof is runtime infrastructure: start the Zero Host stack on a Docker-capable computer, provision ALLEGRO, expose a stable public HTTPS route, then run the end-to-end acceptance suite. Paid infrastructure is optional until measured uptime or scale makes it necessary.
