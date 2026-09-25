# ALLEGRO Supabase production sources

This directory snapshots the live ALLEGRO creator-growth stack currently deployed to Supabase project `yfawrenhudjomhnglfhq`.

## Production functions

- `allegro-creator-api`: authenticated creator workflow plus app_metadata-gated owner moderation.
- `allegro-creator-portal`: creator onboarding, private-master upload, rights declaration, quick interest capture and owner moderation UI.
- `allegro-lead`: controlled public lead intake for Founding Artists, including explicit contact consent and allowed-origin enforcement.
- `allegro-campaign-launch`: campaign distribution desk, Operations Pulse, conversion scorecard, quick capture and seven-day rotation.

## Security rules

- Creator ownership is enforced by RLS for creator-owned records.
- Moderation data and funnel telemetry are denied to anon/authenticated roles and accessed server-side with the service role only.
- ALLEGRO admin authorization uses protected Supabase `app_metadata` only; user-editable metadata is not trusted.
- Track approval re-checks private master presence and exactly 100% master-right ownership before enabling streaming.
- Every moderation decision is written to `allegro_moderation_audit`.

## Production verification on 2026-09-25

- Campaign Launch Desk returned HTTP 200.
- Creator Portal returned HTTP 200.
- Unauthenticated admin API returned HTTP 401.
- Artist-interest lead endpoint accepted the current Supabase origin and returned HTTP 201 in a smoke test; the smoke data was then deleted.
- Supabase security advisor returned no new warnings for the new funnel/moderation tables.
