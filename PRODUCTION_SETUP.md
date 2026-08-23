# ALLEGRO-VIBEZ production activation

## Hosting

Netlify is the production host connected to the GitHub `main` branch. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Production environment variables. `netlify.toml` provides the build settings, SPA routing and baseline security headers.

The public production origin is:

`https://allegro-vibez.netlify.app`

Before promoting a build, confirm the GitHub launch gate and Netlify deploy both succeed.

## Supabase database

Run `supabase/ALLEGRO_VIBEZ_GO_LIVE.sql`, followed by:

1. `supabase/migrations/20260819_payfast_commerce.sql`
2. `supabase/migrations/20260822_payfast_hardening.sql`
3. `supabase/migrations/20260822_payfast_zar_plans.sql`

The ZAR plan migration aligns the paid plans with PayFast checkout for the South African launch. Current launch pricing is Free R0/month, Pro R179/month and Label R899/month, with platform-fee percentages unchanged at 10%, 8% and 6% respectively.

## Supabase Auth URLs

Set the Supabase Authentication **Site URL** to:

`https://allegro-vibez.netlify.app`

Allow redirect URLs required by the app, including:

- `https://allegro-vibez.netlify.app/login`
- `https://allegro-vibez.netlify.app/update-password`

Add the active Netlify deploy-preview origin during acceptance testing, then remove unnecessary preview origins after launch.

## PayFast Edge Functions

Deploy both Edge Functions:

- `payfast-checkout` with JWT verification enabled
- `payfast-notify` with JWT verification disabled, because PayFast authenticates notifications using server-side security checks

Set these Edge Function secrets:

- `APP_ORIGIN=https://allegro-vibez.netlify.app`
- `PAYFAST_MERCHANT_ID`
- `PAYFAST_MERCHANT_KEY`
- `PAYFAST_PASSPHRASE`
- `PAYFAST_SANDBOX=true` during testing; change to `false` only after a successful sandbox payment

The PayFast notification function verifies the signature, merchant ID, expected amount and validates the notification back against PayFast before activating a subscription. The hardening migration also makes subscription activation idempotent so a retried notification cannot grant the same purchase twice.

Supabase supplies its own URL, anon key and service-role key to deployed functions. Never expose the service-role key in Netlify or the browser.

## Launch acceptance test

1. Open Home, Discover, Artists and Join on desktop and mobile.
2. Register and verify a creator account.
3. Save profile information and upload private artwork/audio.
4. Add rights totalling 100%, submit, moderate and publish the release.
5. Confirm the published release appears in Discover and private drafts do not.
6. Complete a PayFast sandbox plan purchase and confirm the subscription activates only after the validated notification.
7. Replay/retry the same notification and confirm the subscription period is not extended a second time.
8. Add a royalty entry, confirm wallet balances and request a payout.
9. Confirm a non-admin cannot access moderation or payout operations.
10. Confirm Privacy, Terms, reset-password and unknown-route pages work on direct navigation.
11. Run `npm run verify:all` and require a green GitHub launch gate.

Do not enable live PayFast processing until the sandbox acceptance test passes.
