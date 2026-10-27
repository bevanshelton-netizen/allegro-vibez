# ALLEGRO-VIBEZ — IZAKHONO Deployment Path

## Objective
Reduce dependence on third-party deployment quotas. GitHub `main` is the source of truth; the runtime must remain portable.

## Current contract
- Static/public application assets must run without Vercel-specific runtime APIs.
- Supabase remains the backend service for Creator OS.
- `vercel.json` is retained only as a reversible fallback routing configuration.
- Production claims require an externally verified URL and commit SHA.

## Recommended owned-first runtime
1. Containerize the static application with Nginx.
2. Serve the repository from IZAKHONO-owned compute/storage.
3. Put Cloudflare in front for DNS, TLS and edge caching where appropriate.
4. Keep Vercel as an optional fallback, not the deployment authority.
5. Preserve GitHub-based build artifacts so the application can be moved between runtimes without code rewrites.

## Deployment verification
A release is green only when:
- the intended commit is built;
- the HTTP endpoint returns 200 for `/`;
- `/creator-os/` returns the Creator OS application;
- critical Creator OS child routes return 200;
- no secrets are embedded in client assets;
- the deployed commit is recorded.

Do not describe a deployment as live until these checks have passed against the actual public endpoint.
