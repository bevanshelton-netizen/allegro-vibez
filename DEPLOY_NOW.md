# ALLEGRO-VIBEZ deployment checkpoint

## Standing production architecture

ALLEGRO-VIBEZ uses the IZAKHONO-owned deployment route as the primary production path.

Primary route:
- IZAKHONO CODE → build/gateway package → owner-controlled IZAKHONO runtime → EDGE/TLS → public DNS
- Platform engine remains independently deployable.
- External hosting is resilience/fallback only and must not replace or control the owned engine.
- Do not call a route live until it independently returns HTTPS 200 and serves the current verified ALLEGRO experience.

External resilience:
- Existing Vercel/other external routes may remain available as reversible fallbacks.
- They must be verified against the current release before being described as current production.

## Current application release

- Source of truth: GitHub `main`
- Runtime build: Node 22
- Build command: `npm run build`
- Compiled output: `dist`
- SPA direct-route fallback: required
- Current important public routes include `/stream`, `/radio`, `/artists`, `/marketplace`, and `/merch`.
- The launch gate runs lint/security/publishing verification plus the production build.

## Canonical ALLEGRO Supabase fallback

The ALLEGRO application code identifies this browser-safe fallback project:

- Project name: `Allegro-Vibez`
- Project ref: `zoolsumifdtanycjryje`
- Public origin: `https://zoolsumifdtanycjryje.supabase.co`
- Role: reversible backend fallback while IZAKHONO Core is primary.

A Supabase notification dated 2026-09-10 states that this exact project was paused after inactivity. Restore/unpause this project before applying production database changes.

The Supabase connector currently exposed in ChatGPT is connected to a different Supabase organization and does not expose `zoolsumifdtanycjryje`. Do not apply ALLEGRO migrations to `IZAKHONO WebStart`, `FAISReady`, or `Edu-Build Institute 360`.

## Marketplace and merch rollout

After the canonical Allegro-Vibez Supabase project is restored and accessible, apply:

`supabase/ALLEGRO_VIBEZ_MARKETPLACE_MERCH_ROLLOUT_20260925.sql`

This bundle contains:
- musician marketplace tables and vetting rules
- fixed 10% ALLEGRO marketplace fee enforcement
- creator merchandise tables and order RPC
- creator merch 90% / ALLEGRO 10% server-side calculation
- merch order hardening
- trusted-admin policy for official ALLEGRO-owned stock

Prerequisite: the existing ALLEGRO creator/workflow schema, including `public.profiles` and `public.is_admin()`, must already exist.

## Provider boundary

Never commit:
- Supabase service-role keys
- payment-provider secrets
- private credentials
- administrator passwords

Only browser-safe publishable/anon keys may be present in frontend configuration.

Payment, payout, royalty settlement and provider-side split settlement must remain provider-gated until their server-side integrations have been independently verified.
