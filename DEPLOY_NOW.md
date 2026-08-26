# Production deployment checkpoint

ALLEGRO-VIBEZ production source is maintained on the GitHub `main` branch and is configured for the connected Netlify site.

## Current checkpoint

- Host configuration: Netlify via `netlify.toml`
- Production origin: `https://allegro-vibez.netlify.app`
- Runtime: Node 22
- Build: `npm run build`
- Publish directory: `dist`
- SPA direct-route fallback: enabled
- GitHub launch gate: lint + publishing verification + security verification + production build
- Frontend bundle: split into application, React/router and Supabase chunks
- React Hook dependency warnings from the previous release candidate: resolved

## Provider boundary

A source commit can trigger the connected deployment, but live creator authentication requires the production Netlify build to contain the browser-safe Supabase URL and publishable/anon key. PayFast must remain in sandbox until the server-side Edge Function configuration and payment acceptance tests pass.

Never commit provider secrets merely to force a deployment to appear live.

Last code-side launch hardening: 2026-08-26.
