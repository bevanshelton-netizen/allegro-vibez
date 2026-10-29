# ALLEGRO-VIBEZ Command Centre Specification

## Purpose
The Command Centre is the authenticated operating layer of ALLEGRO-VIBEZ. It turns the public discovery experience into an artist-business operating system while keeping rights, commercial and provider integrations behind explicit service boundaries.

## Roles
- `artist`: personal career workspace.
- `legacy_artist`: catalogue revival and second-career workspace.
- `manager`: roster and business operations.
- `promoter`: opportunities, bookings and event delivery.
- `venue`: bookings and event inventory.
- `radio`: submissions, playlists, interviews and airplay opportunities.
- `festival`: applications, showcases and programming.
- `brand`: sponsorship and commercial campaigns.
- `admin`: platform governance and verification.

## Routing
Authenticated users enter `/app/` and are routed to a role-specific home. A user may hold multiple roles, but each role is explicitly granted and audited.

### Artist Home
- Career overview
- Profile / EPK
- Catalogue
- Releases
- Campaigns
- Radio
- Festivals
- Charts
- Bookings
- Sponsorship
- Audience
- Tasks

### Legacy Artist Home
- Career history
- Famous catalogue
- Rights-status review
- Missing recordings / metadata
- Revival campaign
- Reissues
- Live revival
- Radio revival
- KORA opportunities
- Sponsorship
- International markets
- Commercial performance

### Manager Home
- Roster
- Artist health
- Releases
- Campaign pipeline
- Opportunities
- Radio
- Festivals
- Bookings
- Commercial
- Revenue / expenses
- Team permissions
- Tasks

## Opportunity lifecycle
`DISCOVERED → MATCHED → APPLIED → SHORTLISTED → CONFIRMED → DELIVERED → COMPLETED`

Declined, withdrawn and expired are terminal/side states and must not be confused with confirmation.

## Career-at-a-glance metrics
The home dashboard should show only verified or clearly labelled data:
- profile completion
- catalogue readiness
- releases in progress
- active campaigns
- radio opportunities
- festival opportunities
- bookings
- chart position
- audience growth
- commercial opportunities
- outstanding tasks

## Security
- Never trust a browser-supplied owner/creator ID.
- Resolve identity from the authenticated session.
- Scope every query and mutation to the authenticated user and explicitly authorised collaborators.
- Protect media/storage objects with ownership-aware policies.
- Audit rights changes, publishing review, commercial state changes, permissions and administrative actions.
- Do not silently assign masters, publishing, royalty or ownership rights.

## Rights-safe Phase 1
The Command Centre supports catalogue preparation, promotion, marketing, opportunities, bookings and commercialisation support. It does not claim to operate a collection society, publishing administrator, royalty administrator or DSP distributor unless a real, verified integration and agreement exists.

## Commercial state model
Commercial records use explicit states such as `proposed`, `pending`, `verified` and `settled`. The UI must never display pending funds as settled income.

## Service boundaries
The UI communicates through application/service adapters for:
- identity/authentication
- database
- storage/media
- payments/commerce
- radio/festival opportunity providers
- distribution providers
- notifications

External providers remain replaceable. Owned infrastructure is the preferred production target.

## Build sequence
1. Authenticated application shell and role routing.
2. Shared dashboard components and navigation.
3. Artist Command Centre.
4. Legacy Artist Command Centre.
5. Manager Command Centre.
6. Opportunity engine UI and persistence.
7. Audit/security enforcement.
8. Owned-infrastructure deployment and independent verification.
