# ALLEGRO-VIBEZ — IZAKHONO Deployment Path

## Objective
Reduce dependence on third-party deployment quotas. GitHub `main` is the source of truth; the runtime must remain portable.

## Current contract
- Static/public application assets must run without Vercel-specific runtime APIs.
- Supabase remains the backend service for Creator OS.
- `vercel.json` is a compatibility artifact only; neither Vercel nor Netlify is a production dependency.
- Production claims require an externally verified URL and commit SHA.

## Recommended owned-first runtime
1. Containerize the static application with Nginx.
2. Serve the repository from IZAKHONO-owned compute/storage.
3. Route public traffic through the IZAKHONO EDGE reverse-proxy/TLS layer using the owned Caddy/Nginx configuration.
4. GitHub Actions publishes an immutable release contract only; NODE01 consumes it and invokes the IZAKHONO release authority.
5. Keep the application portable and independent of Vercel/Netlify build or runtime APIs.

## Deployment verification
A release is green only when:
- the intended commit is built into an immutable OCI image;
- `/artists/` returns the directory and `/artists/{slug}` resolves to the public profile template;
- the artist preview route works without exposing private artist records;
- the HTTP endpoint returns 200 for `/`;
- `/creator-os/` returns the Creator OS application;
- critical Creator OS child routes return 200;
- no secrets are embedded in client assets;
- the deployed commit and image digest are recorded;
- canary, backup/restore, rollback and post-rollback health checks pass.

Do not describe a deployment as live until these checks have passed against the actual public endpoint.
