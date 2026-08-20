# ALLEGRO-VIBEZ production activation

## Hosting

Netlify is the production host connected to the GitHub `main` branch. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Production environment variables. `netlify.toml` provides the build settings, SPA routing and baseline security headers.

## Supabase

Run `supabase/ALLEGRO_VIBEZ_GO_LIVE.sql`, followed by `supabase/migrations/20260819_payfast_commerce.sql`. Deploy both Edge Functions:

- `payfast-checkout` with JWT verification enabled
- `payfast-notify` with JWT verification disabled, because PayFast authenticates notifications using the server-side signature

Set these Edge Function secrets:

- `APP_ORIGIN`
- `PAYFAST_MERCHANT_ID`
- `PAYFAST_MERCHANT_KEY`
- `PAYFAST_PASSPHRASE`
- `PAYFAST_SANDBOX=true` during testing; change to `false` only after a successful sandbox payment

Supabase supplies its own URL, anon key and service-role key to deployed functions. Never expose the service-role key in Vercel or the browser.

## Launch acceptance test

1. Register and verify a creator account.
2. Save profile information and upload private artwork/audio.
3. Add rights totalling 100%, submit, moderate and publish the release.
4. Complete a PayFast sandbox plan purchase and confirm the subscription activates only after the signed notification.
5. Add a royalty entry, confirm wallet balances and request a payout.
6. Confirm a non-admin cannot access moderation or payout operations.
7. Confirm Privacy, Terms, reset-password and unknown-route pages work on direct navigation.

Do not enable live PayFast processing until the sandbox acceptance test passes.
