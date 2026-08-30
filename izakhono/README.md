# IZAKHONO Core integration pack

This directory is the reusable ALLEGRO VIBEZ backend definition for IZAKHONO Core.

- `manifest.json` — project, policy and storage provisioning contract
- `schema.sql` — creator, catalogue, rights, royalties, wallet and payout schema
- `seed.sql` — commercial plan seed data
- `MIGRATION.md` — zero-downtime production cutover procedure

The application remains dual-backend during migration: current Supabase production continues operating until the self-hosted IZAKHONO Core launch gate passes, after which three browser-safe environment values switch the frontend to Core.
