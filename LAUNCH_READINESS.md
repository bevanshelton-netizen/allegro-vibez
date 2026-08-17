# ALLEGRO-VIBEZ Launch Readiness

## Release status

The application code is structured for publication as a Vite/React single-page app using HashRouter, with GitHub Pages deployment from `main`.

## Production capabilities in the codebase

- Creator registration, login and session handling
- Creator profiles and public artist discovery
- Private release upload, artwork/audio storage and creator catalogues
- Release submission, moderation, approval, rejection and publishing workflow
- Rights and contributor records per release
- Royalty ledger and creator prosperity dashboard
- Subscription-plan catalogue and creator subscription records
- Creator wallets and payout requests
- Admin release moderation and payout operations
- Atomic payout validation and finalisation RPCs
- Row-level security policies for creator/admin data separation
- Public Terms of Use and Privacy Notice
- GitHub Actions build and GitHub Pages deployment workflows

## Required Supabase activation order

Apply these SQL files to the production Supabase project in this order:

1. `supabase/migrations/20260813_creator_core.sql`
2. `supabase/migrations/20260813_rights_core.sql`
3. `supabase/migrations/20260813_workflow_prosperity.sql`
4. `supabase/migrations/20260813_commercial_core.sql`
5. `supabase/migrations/20260817_launch_hardening.sql`

## Required GitHub Pages secrets

The deployment workflow expects these repository secrets:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Only the public/anon Supabase key belongs in the frontend build. Never expose a Supabase service-role key, database password, payment-provider secret or webhook secret in Vite environment variables.

## Payment activation

The commercial layer is intentionally non-charging until a payment provider is connected. Paid-plan selection currently communicates that no charge has occurred. A production payment integration must use a server-side or provider-hosted checkout flow with verified callbacks before paid subscriptions are activated automatically.

## Publication gate

Before marketing the platform as fully live, confirm:

- Production Supabase migrations have been applied successfully.
- GitHub Pages secrets are configured.
- A new account can register, verify and log in.
- A creator can save a release draft and upload audio/artwork.
- A creator can add rights/contributors and submit a release.
- An admin account can approve and publish a release.
- The published release appears in Discover.
- Royalty entries are visible only to the correct creator/admin.
- A payout request cannot exceed the withdrawable balance.
- A finalised payout cannot be paid twice.
- Privacy and Terms pages are reachable from the deployed site URL.
- Paid plan checkout remains disabled until the payment provider is deliberately activated.

## GitHub Pages

Deployment is handled by `.github/workflows/deploy-pages.yml` after pushes to `main`. The deployed URL is reported by the `github-pages` deployment environment in GitHub Actions.
