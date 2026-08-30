# ALLEGRO-VIBEZ on IZAKHONO CLOUD Fast Build

ALLEGRO-VIBEZ is now prepared to run on the first-party IZAKHONO stack rather than depending on Netlify/Supabase as its production architecture.

## Fast path

Paste this repository URL into Owner Fast Build:

`https://github.com/bevanshelton-netizen/allegro-vibez`

IZAKHONO CLOUD derives the app name and slug, builds the Docker image, injects the browser-safe IZAKHONO Core connection values, runs the container health gate, and promotes only a healthy version.

## Runtime

- Container port: `8080`
- Health endpoint: `/healthz`
- SPA fallback: enabled through nginx
- Static assets: immutable long-cache headers
- Backend: IZAKHONO Core
- Project slug: `allegro_vibez`

## Required browser-safe build variables

- `VITE_IZAKHONO_CORE_URL`
- `VITE_IZAKHONO_PROJECT=allegro_vibez`
- `VITE_IZAKHONO_PUBLIC_KEY`

Only an `ik_pub_*` project key belongs in the frontend build. Never put an `ik_sec_*` project key, root-admin key, PayFast secret, database password or other server credential in a Vite variable.

The repository contains `izakhono/manifest.json`, `izakhono/schema.sql`, and `izakhono/seed.sql` so IZAKHONO Core can provision the ALLEGRO project before the application container is promoted.

## Cutover rule

Keep the existing public deployment online until the IZAKHONO server passes project provisioning, creator sign-up/sign-in, owner-data isolation, private upload, release submission and rollback checks. DNS/production promotion happens only after those gates pass.
