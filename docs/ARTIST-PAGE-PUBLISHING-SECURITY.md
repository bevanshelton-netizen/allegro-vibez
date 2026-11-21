# ALLEGRO ARTIST PAGES — secure publishing workflow

## Status
This document describes the proposed Phase 1 publishing workflow. The migration paired with it is a review artifact only and has **not** been applied to the shared Supabase project. The current static artist pages remain disconnected from live artist data.

## Existing data boundary confirmed by read-only inspection
- `public.allegro_artists` has owner-scoped authenticated SELECT/INSERT/UPDATE/DELETE policies.
- `public.allegro_artist_profiles` has owner-scoped authenticated SELECT/INSERT/UPDATE policies.
- `public.allegro_artist_epk`, `public.allegro_artist_team`, `public.allegro_artist_calendar`, and `public.allegro_artist_bookings` also have owner-scoped policies.
- No public artist-page SELECT policy was found on these private source tables.
- The existing private EPK includes fields such as booking email, downloadable assets and media links. These must not be copied wholesale into a public page.
- The project contains public storage buckets. A public bucket does not prove that an artist has approved a particular asset for use on their public page.

## Proposed separation
1. **Private source of truth:** existing Artist OS artist, profile, EPK, catalogue and booking records remain private under their current ownership policies.
2. **Owner request:** `allegro_artist_page_requests` stores the requested slug, proposed public-data payload, explicit consent/version/time and workflow state. The proposal grants browser roles no direct table privileges; a trusted server-side workflow must authenticate the owner and handle submission, edits and withdrawal.
3. **Approved public projection:** `allegro_artist_public_pages` is an internal table containing curated fields plus approval metadata. Browser roles receive no direct privileges on it. They receive SELECT only on `allegro_artist_public_directory`, a fixed-column `security_barrier` view filtered to `publication_status = 'published'` and `artist_consent = true`.
4. **Publication service:** a trusted server-side service reviews the request and writes the projection. No service-role secret may be placed in browser code. No SECURITY DEFINER shortcut is proposed.
5. **Withdrawal:** the artist submits a withdrawal request or revokes consent through the authenticated workflow. The trusted publication service suspends/removes the public projection promptly and records the audit event.

## State machine
- `draft`: owner is preparing a page.
- `submitted`: owner has confirmed consent and submitted the proposed fields for review.
- `approved`: internal review is complete (workflow state, not public by itself).
- `published`: only the approved projection becomes publicly queryable.
- `suspended`: temporarily hidden while a rights, safety, accuracy or consent issue is investigated.
- `withdrawal_requested` / `withdrawn`: artist asks to unpublish or withdraws consent.

The draft migration intentionally keeps request statuses separate from public projection status. A request cannot publish itself. A trusted publication workflow must perform the approval and projection write. Browser roles have no direct request-table privileges until a separately reviewed, field-restricted request API or RPC is implemented; this is an explicit functionality blocker, not an implied working workflow.

## Public field allowlist
- Artist display name and approved slug.
- Approved biography and tagline.
- Approved city and country.
- Specifically approved avatar/banner URLs.
- Explicitly approved music links, social links, event details and press items.

## Never expose by default
- Owner/user IDs, account email, booking email, phone or private contact details.
- Team membership, role grants, private messages, internal notes or review evidence.
- Contracts, deal memos, payout destinations, bank/tax information or financial ledger data.
- Raw storage object paths, private upload URLs, unpublished tracks or unapproved media.
- Unverified awards, chart claims, booking confirmations, earnings or rights-clearance claims.

## Consent and rights
- Consent must be explicit, versioned, timestamped and tied to the artist record and requested publication.
- Consent is for the public artist page and approved public fields/assets only; it does not transfer copyright or master ownership.
- Each uploaded or linked music item remains subject to the existing RIGHTS-SAFE-MODE declaration (OWNED / CONTROLLED or AUTHORISED) and a recorded promotional-use scope.
- Radio/broadcast use still requires its own applicable clearance or permission.
- Booking contact and submission must be implemented as a separate public intake service with spam controls, rate limits, data-retention rules and private routing. The existing `/app/bookings/` route is an authenticated Artist OS workspace, not a public enquiry form.

## Release gates
- Review migration against the live schema, foreign keys, role grants, RLS and project-wide dependencies.
- Verify anonymous/authenticated users cannot SELECT either underlying table and can read only the fixed-column public view.
- Implement and test the trusted owner-request API; do not restore broad table grants to make the UI work.
- Apply first to an isolated staging project and test anonymous, authenticated owner, other authenticated user and trusted publication-service paths.
- Verify no public read path reaches private source tables or private storage.
- Test consent versioning, withdrawal, slug collisions, XSS-safe rendering, URL allowlists, oversized payloads and malformed JSON.
- Add audit events for submit, approve, publish, suspend and withdraw.
- Run mobile, accessibility and route tests.
- Only then connect the artist directory/profile pages to the public projection.

## Explicit non-actions
This proposal does not change existing tables, policies, grants, storage buckets, artist records, DNS, payments, production deployments or the main branch. The migration is not executed by this PR.
