# ALLEGRO VIBEZ → IZAKHONO Core

ALLEGRO VIBEZ now carries its own IZAKHONO Core provisioning pack and a dual-backend browser adapter.

## Operating rule

The live application remains on the current Supabase backend until the self-hosted IZAKHONO Core server passes production validation. No customer-facing downtime is required for the migration.

When these browser-safe variables are present, the app automatically prefers IZAKHONO Core:

- `VITE_IZAKHONO_CORE_URL`
- `VITE_IZAKHONO_PROJECT=allegro_vibez`
- `VITE_IZAKHONO_PUBLIC_KEY`

If they are absent, the existing Supabase production path remains active.

## Minimum Core release

Use **IZAKHONO Core v0.3.1 or newer**. v0.3.1 hardens private storage so browser/public project keys may read or overwrite only objects owned by the authenticated user; server-side `ik_sec_*` credentials retain trusted protected-operation access.

## One-command project provisioning

From an IZAKHONO Core v0.3.1+ release on the server:

```bash
python3 scripts/provision-project.py /path/to/allegro-vibez/izakhono/manifest.json \
  --base-url https://YOUR_CORE_API \
  --out /secure/allegro-vibez-keys.json
```

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

Do not switch production variables until all of these pass on the real server:

1. Core `/healthz` and `/readyz`.
2. Project provisioning and one-time key capture.
3. Creator signup/signin/session persistence.
4. Owner isolation for profiles, releases, rights, wallet and payouts.
5. Private release upload/download, including denial of cross-account object reads and overwrites.
6. Public published-release and public-profile discovery without draft/admin-field leakage.
7. Payout validation.
8. Backup and isolated restore drill.
9. Protected ALLEGRO admin operations and PayFast server functions.
10. Production smoke test after DNS/environment cutover.

## Protected operations

The browser adapter deliberately does not expose administrative credentials. Release moderation, payout administration and PayFast checkout remain protected server operations. Until the IZAKHONO server-operations layer is activated, the current Supabase server functions remain the production implementation for those flows.
