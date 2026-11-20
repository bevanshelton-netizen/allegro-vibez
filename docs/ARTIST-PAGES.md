# ALLEGRO ARTIST PAGES — Implementation contract

## Purpose
Provide every participating artist with a premium, website-style public destination within the single canonical ALLEGRO VIBEZ platform. The design reference supplied by the owner is the Clinton Viljoen website (content-led artist/creator site with biography, work, events, press and booking pathways). This implementation is original ALLEGRO design and must not copy protected source code or assets.

## Routes
- `/artists/` — public artist directory.
- `/artists/:slug` — individual artist page (Vercel rewrite and Netlify deploy-preview rewrite).
- `/artists/profile.html?preview=1` — design-only template preview. Never represents a real artist.
- `/artist-os/` — existing private artist command centre.

## Current implementation status
This PR adds the responsive page system and route shell only. The directory deliberately states that the public feed is pending. A slug route displays an unpublished/not-found state until a secure public profile resolver is connected. It does not expose Supabase tables or invent artist records, bookings, releases, awards, events or contact details.

## Existing data foundations inspected
- `public.allegro_artists`: id, owner_id, stage_name, slug, bio, country_code, city, avatar_object_path, banner_object_path, verified, status, timestamps.
- `public.allegro_artist_profiles`: user_id, artist_id, artist_type, bio, country_code, profile_completion, timestamps.
- `public.allegro_artist_epk`: user_id, headline, biography, press_quotes, achievements, booking_email, website_url, media_links, download_assets, updated_at.
- Existing release and track records remain in the current catalogue/Creator OS.

## Mandatory data-access design before enabling public content
1. Do not grant anonymous access to the private base tables or broaden existing RLS policies.
2. Create a narrowly scoped public projection (view or RPC) after reviewing current grants, policies, storage rules and schema exposure. Expose only fields explicitly approved for publication.
3. Require an explicit publish/consent state and a stable slug; only approved active profiles are resolvable.
4. Do not expose owner_id, user_id, private email/phone, team, payment, payout, tax, messages, private documents, internal notes, booking contract/payment status or unpublished catalogue data.
5. Resolve images through approved public assets or short-lived signed URLs; do not publish raw private storage paths.
6. Music links must be artist-approved and rights-cleared for the intended display/use. Radio eligibility remains governed by signed-artist agreement and track-specific broadcast clearance.
7. Bookings must use the existing ALLEGRO booking service with spam protection, consent, validation, rate limits and audit evidence. An enquiry is not a confirmed booking.
8. Verify RLS, schema grants, function EXECUTE privileges, SECURITY DEFINER search_path and storage policies before deployment.

## Page sections
Hero identity and portrait; biography/story; music/releases; live appearances; achievements; press/interviews; media kit; booking and commercial enquiries; social links; FAQs/contact where approved. Sections without verified data should be omitted or display a clear empty state.

## QA and release gates
- HTML validation and semantic/accessibility checks.
- Mobile, tablet and desktop visual QA.
- Slug encoding, unknown slug, missing content and XSS tests (use textContent; never inject artist content with innerHTML).
- Directory and profile route smoke tests.
- Public/private data leakage tests and negative authorization tests.
- Confirm existing Artist OS, Studios, Radio, booking and payment workflows remain unaffected.
- Do not merge or deploy until the public data resolver and security review are complete.
