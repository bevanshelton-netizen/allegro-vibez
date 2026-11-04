# ALLEGRO VIBEZ — Production Foundation

ALLEGRO-VIBEZ is an African-born, global-by-design music, creator and culture platform.

## Current release
- Purpose-led public landing experience
- Music discovery, Artists & Creators, Platform, Radio and Culture entry points
- Responsive, dependency-free frontend
- Accessibility foundations: skip link, semantic navigation, visible keyboard focus and reduced-motion support
- Production SEO metadata, canonical URL, robots policy and XML sitemap
- Container-ready Nginx runtime on port 8080
- `/healthz` health-check asset for runtime verification
- Creator OS catalogue workspace for releases, tracks, credits, rights splits and audio-asset registration
- Dedicated Creator OS publishing-review workflow at `/creator-os/publishing-review.html`
- ALLEGRO Live ecosystem at `/live-entertainment/` for live music, bookings, festivals, venues, production, ticketing, sponsorship and fan intelligence

## Creator OS release workflow
Creator OS separates catalogue readiness from distribution. A creator can prepare a release, verify required metadata/rights/audio conditions, and request publishing review through authenticated Supabase RPCs.

The publishing-review action does **not** claim DSP distribution, delivery to a distributor, or royalty payment. Provider integrations remain separate and replaceable.

## ALLEGRO Live
ALLEGRO Live takes the live-entertainment concepts relevant to the ALLEGRO music economy and integrates them around the creator operating system:

- Artist live profiles, EPKs, availability and booking readiness
- Concerts and festivals
- Venue discovery and matching
- Show production, riders and technical requirements
- Ticketing and event commerce readiness
- Sponsorship and brand opportunities
- Fan engagement and verified audience intelligence
- Event-to-career and event-to-settlement records

Generic sports entertainment and broad immersive/AR/VR categories are deliberately not core ALLEGRO Live scope at this stage. They may become future partnership categories without distracting from the music-first platform.

The live layer does **not** claim real ticket inventory, event bookings, payments, settlements or audience metrics until the underlying integrations and evidence exist.

## Production architecture
The public site is a static frontend. The repository deliberately avoids unnecessary runtime dependencies so the production build remains portable across owned infrastructure and external hosting fallbacks.

The Docker image serves the complete public asset set, including SEO discovery files and Creator OS routes.

## Important launch rule
Production is not declared live merely because code exists or a deployment is created. The actual public HTTPS route and health check must pass before a release is considered verified.

## Deployment discipline
Production deployment must point to the intended Git commit and must be independently verified after deployment. External hosting limits or deployment gates must not be bypassed by changing billing, security, or ownership settings without explicit authorization.

## Future integrations
Radio streaming, creator accounts, commerce/payment processing, artist services, DSP/distribution providers, live ticketing, event settlement and other platform capabilities should only be marked live after their real integrations and credentials have been connected and verified.

Canonical contact: contact@allegrovibez.com


## Artist Management — core ALLEGRO capability

Artist Management is a native capability of ALLEGRO-VIBEZ, delivered through the authenticated Artist OS and its connected management services. It is not a standalone product or a separate artist database.

The Artist Management workspace brings together:

- Artist identity, profile, team and career goals.
- Catalogue, rights records, releases and publishing readiness through Creator OS.
- Opportunity discovery, bookings, calendar, EPK, riders and collaboration.
- Career development and artist growth planning.
- Legacy Artist Revival, including catalogue recovery, rights review, rebranding, campaign execution and evidence-backed commercial outcomes.
- Executive action monitoring, intervention tasks, escalation queues, resolution records and evidence-based closure.
- International booking and touring support through ALLEGRO MANAGEMENT.

The authenticated Artist OS is the artist-facing command centre at `/artist-os/`. The management services and legacy revival controls operate against the same artist identity and owner-scoped records. The public ALLEGRO MANAGEMENT page describes the professional management pathway; it is not a separate platform.

Rights and financial integrity remain mandatory: artists/rightsholders retain ownership unless a separate explicit agreement says otherwise; no catalogue rights, royalties, payments, bookings or settlements are represented as verified without the relevant evidence and integrations.
