# ALLEGRO VIBEZ → IZAKHONO Core

ALLEGRO VIBEZ carries its own IZAKHONO Core provisioning pack and a dual-backend browser adapter.

## Operating rule

A paid VPS is **not** required to continue this migration. IZAKHONO CLOUD Zero-Cost Host Mode can run Core on an existing computer and use that machine as the first host. A later move to dedicated hardware or paid infrastructure changes the deployment target, not the ALLEGRO application contract.

The live application remains on the current Supabase backend until whichever self-hosted IZAKHONO machine we use passes the launch gates below. No customer-facing downtime is required for the migration.

When these browser-safe variables are present, the app automatically prefers IZAKHONO Core:

- `VITE_IZAKHONO_CORE_URL`
- `VITE_IZAKHONO_PROJECT=allegro_vibez`
- `VITE_IZAKHONO_PUBLIC_KEY`

If they are absent, the existing Supabase production path remains active.

## Zero-Cost Host path

Start **IZAKHONO CLOUD Zero-Cost Host Mode v1.0** on an existing Docker-capable computer. Its default local Core address is:

```text
http://127.0.0.1:8787
```

The Zero Host package includes a fast-path helper that downloads this repository's `manifest.json`, `schema.sql` and `seed.sql` and provisions ALLEGRO on Core:

```powershell
.\scripts\provision-allegro.ps1
```

The resulting `allegro-vibez-keys.json` contains the one-time project keys. The browser receives only the `ik_pub_*` value. The `ik_sec_*` value remains private/server-side.

## Minimum Core release

Use **IZAKHONO Core v0.3.1 or newer**. v0.3.1 hardens private storage so browser/public project keys may read or overwrite only objects owned by the authenticated user; server-side `ik_sec_*` credentials retain trusted protected-operation access.

## Generic project provisioning

From an IZAKHONO Core v0.3.1+ release:

```bash
python3 scripts/provision-project.py /path/to/allegro-vibez/izakhono/manifest.json \
  --base-url http://127.0.0.1:8787 \
  --out /secure/allegro-vibez-keys.json
```

For a later public host, replace the base URL with that host's HTTPS Core address.

The manifest applies `schema.sql`, `seed.sql`, table policies and the private `release_assets` bucket.

## Security decisions already encoded

- Draft/private releases are owner-only.
- Public discovery uses the `published_releases` view instead of exposing the releases table.
- Public artist discovery uses `public_profiles`; internal profile fields such as the administrator role stay owner-only.
- Rights/contributor records are owner-only.
- Royalty, subscription, wallet and payout records are owner-only.
- Release media is stored in a private bucket with object-owner enforcement in Core v0.3.1+.
- Payout requests are validated server-side against available balance and already-reserved requests.
- The browser receives only the `ik_pub_*` project key. `ik_sec_*` remains server-side.

## Cutover gate

Do not switch the public production frontend to IZAKHONO Core until all of these pass on the actual machine that will serve users:

1. Core `/healthz` and `/readyz`.
2. Project provisioning and one-time key capture.
3. Creator signup/signin/session persistence.
4. Owner isolation for profiles, releases, rights, wallet and payouts.
5. Private release upload/download, including denial of cross-account object reads and overwrites.
6. Public published-release and public-profile discovery without draft/admin-field leakage.
7. Payout validation.
8. Backup and isolated restore drill.
9. Protected ALLEGRO admin operations and PayFast server functions.
10. Production smoke test after the public routing/environment cutover.

## Protected operations

The browser adapter deliberately does not expose administrative credentials. Release moderation, payout administration and PayFast checkout remain protected server operations. Until the IZAKHONO server-operations layer is activated, the current Supabase server functions remain the production implementation for those flows.

## Cost rule

Keep the working production fallback while we prove our own host. Do not buy infrastructure simply because it is the conventional next step. Introduce paid compute only when uptime, traffic, storage, redundancy or revenue gives us a measured reason to do so.
