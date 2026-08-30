# ALLEGRO VIBEZ → IZAKHONO Core

ALLEGRO VIBEZ now uses the IZAKHONO Core client contract. No Supabase client is instantiated by the runtime adapter.

## No paid VPS required to continue

A paid server is not a prerequisite for the next build stage. **IZAKHONO CLOUD Zero-Cost Host Mode v1.0** can run the Core API, PostgreSQL, storage, Cloud control plane, app runner, backups and Owner Console on an existing Docker-capable computer.

The local Core address in Zero-Cost Host Mode is:

```text
http://127.0.0.1:8787
```

That address is correct for applications running on the same computer. A public Netlify frontend cannot use `127.0.0.1`, because that would point to each visitor's own device. Before public cutover, route a public HTTPS address to the same IZAKHONO host using an existing public network route or a free encrypted tunnel.

## Runtime variables

The browser build requires only browser-safe IZAKHONO values:

- `VITE_IZAKHONO_CORE_URL`
- `VITE_IZAKHONO_PROJECT=allegro_vibez`
- `VITE_IZAKHONO_PUBLIC_KEY=ik_pub_...`

Never put an `ik_sec_*` project key or the Core root-admin key in Vite/browser variables.

## Minimum Core release

Use **IZAKHONO Core v0.3.1 or newer**. v0.3.1 enforces object ownership for private storage reads and overwrites made through browser/public project keys while preserving trusted server-side access for `ik_sec_*` operations.

## Zero Host fast path

The Zero Host package includes an ALLEGRO helper:

```powershell
.\scripts\provision-allegro.ps1
```

It downloads this repository's version-controlled `manifest.json`, `schema.sql` and `seed.sql`, provisions the `allegro_vibez` Core project, creates the data exposures and private `release_assets` bucket, and writes the one-time project keys to `allegro-vibez-keys.json`.

## Generic provisioning

From an IZAKHONO Core v0.3.1+ source tree:

```bash
python3 scripts/provision-project.py /path/to/allegro-vibez/izakhono/manifest.json \
  --base-url http://127.0.0.1:8787 \
  --out /secure/allegro-vibez-keys.json
```

For a public host, replace the base URL with its reachable HTTPS Core URL.

## Security decisions encoded in the ALLEGRO manifest

- Internal creator profiles are owner-only; public artist discovery uses `public_profiles`.
- Draft/private releases are owner-only; public discovery uses `published_releases`.
- Rights/contributor records are owner-only.
- Royalty, subscription, wallet and payout records are owner-only.
- Release media uses a private `release_assets` bucket.
- Core v0.3.1+ denies cross-account private-object reads and overwrites.
- Payout insertion is protected by server-side balance validation in the ALLEGRO schema.
- Browser code receives only `ik_pub_*` credentials.

## Cutover gate

Do not point the public ALLEGRO frontend at the new host until all of these pass on the machine that will actually serve users:

1. Core `/healthz` and `/readyz`.
2. ALLEGRO manifest provisioning and one-time key capture.
3. Creator signup/signin/session persistence.
4. Owner isolation for profiles, releases, rights, wallet and payouts.
5. Private release upload/download and denial of cross-account media access.
6. Public artist/release discovery without private/admin-field leakage.
7. Backup creation and restore proof.
8. A stable public HTTPS route to the Core host.
9. Protected moderation, payout-admin and PayFast server operations.
10. End-to-end production smoke test from outside the host machine.

## Protected operations still to activate

The browser adapter deliberately refuses to expose administrator credentials. Release moderation, payout administration, password-recovery delivery and PayFast checkout/notification processing require protected server-side services on the IZAKHONO host. They must be activated and tested before those functions are marketed as live.

## Cost rule

Use the existing computer as the first host and keep optional monitoring off unless needed. Introduce paid compute only when measured uptime, traffic, storage, redundancy or revenue makes it worthwhile.
