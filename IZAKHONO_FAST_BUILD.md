# ALLEGRO-VIBEZ on IZAKHONO CLOUD Fast Build

This repository is prepared for IZAKHONO CLOUD v1.2 Fast Build Mode.

## Fast path

Paste this repository URL into Owner Fast Build:

`https://github.com/bevanshelton-netizen/allegro-vibez`

The build can derive the app name and slug automatically, build the repository with Docker, attach secrets, run the container health gate, and promote only a healthy version.

## Runtime

- Container port: `8080`
- Health endpoint: `/healthz`
- SPA fallback: enabled through nginx
- Static assets: immutable long-cache headers
- Security headers: aligned with the current Netlify production policy

## Browser-safe build variables

The current frontend can use:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Only the public/publishable Supabase browser key belongs in `VITE_SUPABASE_ANON_KEY`. Never place a Supabase service-role/secret key in the frontend build.

The repository also contains `izakhono/manifest.json`, `izakhono/schema.sql`, and `izakhono/seed.sql` for the IZAKHONO Core backend transition.
