# ALLEGRO-VIBEZ Launch Readiness

## Release status

ALLEGRO-VIBEZ is a Vite/React single-page application prepared for production on Netlify from the GitHub `main` branch. Netlify provides the SPA fallback through `netlify.toml`, so browser routes such as `/login`, `/dashboard` and `/update-password` resolve through `index.html`.

The GitHub launch gate currently verifies linting, publishing structure, frontend secret boundaries, PayFast safeguards and the production Vite build.

## Production capabilities in the codebase

- Creator registration, login, verification, password recovery and session handling
- Creator profiles and public artist discovery
- Private release upload, artwork/audio storage and creator catalogues
- Release submission, moderation, approval, rejection and publishing workflow
- Rights and contributor records per release
- Royalty ledger and creator prosperity dashboard
- Subscription-plan catalogue and PayFast hosted checkout integration
- Creator wallets and payout requests
- Admin release moderation and payout operations
- Atomic payout validation and finalisation RPCs
- PayFast callback validation and idempotent subscription activation
- Row-level security policies for creator/admin data separation
- Public Terms of Use and Privacy Notice
- SEO/social metadata, robots and sitemap
- GitHub Actions launch gate
- Netlify production configuration and SPA routing

## Required Supabase activation order

For the production Supabase project, use the consolidated launch SQL first, then the PayFast migrations:

1. `supabase/ALLEGRO_VIBEZ_GO_LIVE.sql`
2. `supabase/migrations/20260819_payfast_commerce.sql`
3. `supabase/migrations/20260822_payfast_hardening.sql`
4. `supabase/migrations/20260822_payfast_zar_plans.sql`

Do not blindly rerun migrations against an already-populated production database. Confirm schema state before applying any migration that may already have been executed.

## Required Netlify environment variables

The frontend production build requires:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Only a browser-safe Supabase publishable/anon key belongs in the frontend build. Never expose a Supabase service-role key, database password, PayFast merchant key/passphrase or webhook secret in Vite environment variables.

## Required Supabase Auth configuration

Set the production Site URL to:

`https://allegro-vibez.netlify.app`

Allow the application redirect routes used for sign-in verification and password recovery, including:

- `https://allegro-vibez.netlify.app/login`
- `https://allegro-vibez.netlify.app/update-password`

A deploy-preview origin may be temporarily allowlisted for acceptance testing and removed after launch.

## Payment activation

Deploy the `payfast-checkout` and `payfast-notify` Supabase Edge Functions and configure server-side PayFast secrets as described in `PRODUCTION_SETUP.md`.

Keep `PAYFAST_SANDBOX=true` until a complete sandbox purchase, callback validation and replay/idempotency test passes. Live PayFast processing must not be enabled merely because the frontend checkout button renders.

## Publication gate

Before marketing the platform as fully transactional, confirm:

- Production Supabase migrations have been applied successfully.
- Netlify contains the two browser-safe Supabase environment variables.
- Supabase Auth production/redirect URLs are configured.
- A new account can register, verify and log in.
- A creator can save a release draft and upload audio/artwork.
- A creator can add rights/contributors and submit a release.
- An admin account can approve and publish a release.
- The published release appears in Discover while private drafts remain private.
- Royalty entries are visible only to the correct creator/admin.
- A payout request cannot exceed the withdrawable balance.
- A finalised payout cannot be paid twice.
- Privacy, Terms, reset-password and unknown routes work on direct navigation.
- A PayFast sandbox purchase activates only after a validated notification.
- Replaying the same PayFast notification does not extend the subscription twice.
- `npm run verify:all` passes on the exact production commit.
- The connected Netlify production deployment completes successfully.

## Current engineering state

The codebase, security verifier and production build gate are green. Remaining go-live work that cannot be represented safely in source control is limited to authenticated provider configuration and end-to-end production acceptance using the Supabase and PayFast accounts.
