# ALLEGRO-VIBEZ

**More Than Music. A Movement. The Global Artist Prosperity Platform.**

ALLEGRO-VIBEZ is a creator-first music platform for registration, catalogue management, private media storage, rights-aware release workflows, discovery and creator prosperity tooling.

## Production build

The main branch now includes:

- React + Vite application shell
- Supabase authentication with session persistence
- Creator registration with display name, stage name and account type metadata
- Protected dashboard, Creator Hub, Upload and My Music routes
- Draft release creation and private release-asset uploads
- Creator catalogue and release-status views
- Public artist directory and published-release discovery views
- Supabase SQL migration with profiles, releases, RLS policies and a private `release-assets` bucket
- GitHub Actions build and GitHub Pages deployment workflows
- Vercel production routing and security headers
- PayFast hosted checkout through authenticated Supabase Edge Functions
- Signed payment-notification handling and auditable transaction records
- Subscription activation only after a verified completed payment
- Creator wallets, payout requests and administrator payout operations

## Local development

```bash
npm install
npm run dev
```

Create `.env.local` in the project root:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

Never commit `.env.local`, service-role keys or other secrets.

## Production activation

Follow `PRODUCTION_SETUP.md`. It covers the consolidated database migration, PayFast commerce migration, Edge Functions, secrets and launch acceptance test.

## Verification

```bash
npm run build
npm run lint
```

Production secrets are supplied through GitHub Actions or the selected hosting platform, never through committed source files.
