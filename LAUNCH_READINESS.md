# ALLEGRO-VIBEZ Launch Readiness

## Release status

ALLEGRO-VIBEZ is an IZAKHONO-owned-first Vite/React application. The canonical public origin is `https://allegrovibez.com`. The primary production target is the IZAKHONO APP FABRIC / NODE01 runtime; hosted platforms are fallbacks and must not be used as the primary health signal.

The owned web image is published through GitHub Actions to GHCR as `ghcr.io/bevanshelton-netizen/allegro-vibez-web:production-master`. The image contains the production Vite build behind nginx and exposes a machine-verifiable `/healthz` contract.

## Production capabilities represented in source

- Creator signup/signin and persisted sessions through the selected backend contract
- Creator profiles and safe public artist discovery
- Private release upload, artwork/audio storage and creator catalogues
- Release submission and rights/contributor records
- Royalty ledger, creator wallet and payout-request UI
- Subscription-plan catalogue
- Terms of Use and Privacy Notice
- SEO/social metadata, robots and sitemap
- IZAKHONO Core compatibility client with owned-first selection
- Owned web container health contract
- GitHub Actions build/release/smoke gates

## Capabilities that require protected server activation

These must not be represented as live merely because the UI exists:

- administrator release moderation/publishing
- payout administration/finalisation
- payment checkout creation and notification validation
- password-reset email delivery and password recovery completion

The browser client deliberately refuses privileged server operations until their owner-controlled implementations are active.

## Owned runtime gates

Before public promotion, the owner-controlled environment must prove:

- Allegro web `/healthz` passes;
- Allegro web root and `/radio` routes pass;
- Allegro Core `/health` passes;
- CRM, Revenue, Tasks, FLOW and APP FABRIC Gateway are healthy;
- FLOW persistence backup/restore proof passes;
- IZAKHONO ONE → FLOW bridge passes;
- public edge HTTPS `/health` passes after DNS cutover;
- the exact release commit passes `npm run verify:all`.

## Backend selection

When `VITE_IZAKHONO_CORE_URL`, `VITE_IZAKHONO_PROJECT` and `VITE_IZAKHONO_PUBLIC_KEY` are supplied, the browser selects `izakhono-core`. Until those values are backed by a verified public Core endpoint, the compatibility backend remains available as resilience fallback.

Only browser-safe public keys may enter the frontend. Server secrets, root-admin credentials, database passwords and payment credentials remain outside the bundle.

## Public cutover

Do not call ALLEGRO publicly live merely because a GitHub build or hosted deployment succeeded. The final gate is:

**SOURCE → BUILD → IMAGE → NODE01 → CORE → EDGE/TLS → PUBLIC HTTPS → END-TO-END ACCEPTANCE.**

Vercel/Netlify may be retained for resilience, but hosted deployment rate limits do not block the owned production path.
