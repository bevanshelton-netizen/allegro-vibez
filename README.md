# ALLEGRO VIBEZ

**More Than Music. A Movement. The African-born Global Artist Prosperity Platform.**

ALLEGRO VIBEZ is a creator-first music ecosystem for artist identity, catalogue management, protected media, rights-aware release workflows, discovery, creator prosperity and auditable commercial operations.

## Publishing build

The current release candidate includes:

- Cinematic artist-first Home, Discover and Artists experiences
- Responsive mobile navigation and conversion-first creator signup journey
- React + Vite application shell with Netlify SPA routing
- Supabase authentication with session persistence and password recovery
- Creator registration, profile and public creator identity
- Creator Hub, Dashboard, Upload and My Music routes
- Private release audio/artwork storage and controlled release workflow
- Rights and contributor records attached to releases
- Administrator moderation, approval and publishing workflow
- Published-release discovery and public artist directory
- Royalty ledger, creator prosperity dashboard and wallet visibility
- Payout requests and administrator payout operations
- Creator subscription plans and PayFast hosted checkout
- PayFast notification validation, amount checks and idempotent subscription activation
- Terms, Privacy, SEO/social metadata, robots and sitemap
- GitHub publishing gate with lint, security verification and production build

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

Never commit `.env.local`, service-role keys, PayFast secrets or other server-only credentials.

## Production activation

Follow `PRODUCTION_SETUP.md` for the database migration order, Auth redirect configuration, PayFast Edge Functions, secrets and end-to-end launch acceptance test.

## Launch verification

```bash
npm run verify:all
```

The launch gate checks project structure, secret boundaries, PayFast security guards, ESLint and the production Vite build. Production secrets are supplied through the hosting/service environment, never through committed browser source.
