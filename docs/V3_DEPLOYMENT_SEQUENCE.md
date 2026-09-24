# ALLEGRO-VIBEZ V3 deployment sequence

1. Keep the current Supabase project backed up before schema changes.
2. Compare existing tables with `supabase/migrations/001_initial_schema.sql`; do not re-run baseline blindly on a populated project.
3. Apply only compatible missing baseline objects, then apply `002_security_workflows.sql`.
4. Apply `003_discovery_engagement_royalties.sql` after confirming `releases`, `tracks`, `release_tracks`, `stream_events`, `notifications` and `wallets` exist.
5. Copy `.env.example` to `.env.local` and enter only the Supabase project URL and publishable/anon key. Never put service-role secrets in the browser project.
6. Run `START_WINDOWS.bat` or `cmd /c npm run dev` from Windows Command Prompt.
7. Test in order: registration -> onboarding -> upload -> My Music -> submit -> admin moderation -> publish -> Discover -> Release playback -> stream event -> Notifications -> Royalties.
8. Use two separate test users for cross-account RLS tests before production.

## Provider-gated work

Production DSP distribution, card billing, bank payouts, royalty imports, malware scanning/transcoding and transactional email require approved external providers and server-side secrets. Their interfaces can be connected later without moving those secrets into React.
