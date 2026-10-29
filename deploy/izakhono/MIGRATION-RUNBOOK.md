# ALLEGRO-VIBEZ — IZAKHONO-Owned Hosting Migration

## Objective

Move `allegrovibez.com` from Vercel to IZAKHONO-owned/container hosting without taking the production domain offline.

## Current architecture

- Source: GitHub repository `bevanshelton-netizen/allegro-vibez`
- Application: Dockerized static site
- Internal app port: `8080`
- Reverse proxy/TLS: Caddy
- Domains: `allegrovibez.com` and `www.allegrovibez.com`
- Health endpoint: `/healthz`

The repository already contains a Dockerfile and an IZAKHONO Docker Compose deployment definition.

## Server prerequisites

The destination server must provide:

1. Docker Engine + Docker Compose plugin.
2. Public IPv4 address.
3. TCP 80 and 443 reachable from the Internet.
4. DNS control for `allegrovibez.com`.
5. Persistent storage for Caddy's `/data` and `/config` volumes.

## Deployment

From a clean deployment directory:

```bash
git clone https://github.com/bevanshelton-netizen/allegro-vibez.git
cd allegro-vibez
cp deploy/izakhono/.env.example deploy/izakhono/.env
# edit deploy/izakhono/.env with the production ACME email

docker compose -f deploy/izakhono/docker-compose.allegro.yml up -d --build
```

## Verification

```bash
docker compose -f deploy/izakhono/docker-compose.allegro.yml ps
curl -fsS https://allegrovibez.com/healthz
curl -I https://allegrovibez.com/
curl -I https://www.allegrovibez.com/
```

The migration is considered successful only when:

- the container is healthy;
- HTTPS works on the apex domain;
- HTTPS works on `www`;
- the home page returns HTTP 200;
- assets load correctly;
- charts and major navigation pages work;
- no Vercel hostname is required by the production site;
- DNS points the public domain to the IZAKHONO server;
- the production domain is observed working after DNS propagation.

## DNS cutover

Do not change DNS until the IZAKHONO deployment has been tested using a temporary hostname or direct server validation.

After validation, point the apex and `www` records to the IZAKHONO hosting endpoint according to the actual server's DNS configuration. Do not publish guessed IP addresses.

## Vercel retirement

The main Vercel project must remain available until the custom domain has been verified on IZAKHONO infrastructure. After successful cutover, remove the Vercel domain bindings and delete the obsolete Vercel projects.

Do not claim the migration is complete until the domain is actually verified on the IZAKHONO server.
