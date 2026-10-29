# ALLEGRO-VIBEZ — ALLEGRO CORE Architecture

## Purpose
ALLEGRO-VIBEZ is the African Artist Operating System: a platform where music becomes a career.

This architecture separates the public experience from operational data, rights-sensitive workflows and commercial systems. External providers are replaceable; no provider is treated as the business itself.

## Core domains

### Identity & roles
- artist
- manager
- promoter
- venue
- radio
- festival
- brand/sponsor
- administrator

### Artist business
- artists
- artist_profiles
- teams
- releases
- tracks
- genres
- subgenres
- media_assets
- press_kits
- opportunities
- applications
- bookings
- campaigns

### Legacy catalogue
- catalog_items
- catalog_tracks
- rights_holders
- rights_declarations
- catalogue_offers
- licensing_opportunities
- revival_campaigns

Legacy catalogue functionality is rights-safe by default. Ownership is never inferred from upload or historical association. Commercial use requires verified rights and an applicable agreement.

### Charts
- chart_periods
- chart_entries
- chart_scores
- chart_snapshots
- chart_audit_events

Chart snapshots are immutable once published. The initial scoring model is:
- 30% verified ALLEGRO listening/completion
- 20% verified radio airplay
- 15% saves/follows/repeat engagement
- 15% verified fan voting
- 10% bookings/live activity
- 10% cross-territory audience growth

The methodology must be published before a chart period starts.

### Radio & festivals
- radio_stations
- radio_contacts
- radio_opportunities
- radio_submissions
- festival_opportunities
- festival_applications
- showcase_events
- event_results

A partner status must never be assigned merely because an organisation exists in the database. Partner means confirmed.

### Commercial
- sponsor_opportunities
- sponsor_campaigns
- commercial_offers
- orders
- settlements
- revenue_share_agreements
- invoices

Financial records must distinguish proposed, pending, verified and settled states. The platform must never claim that money has been processed unless the underlying integration confirms it.

## Security principles
1. Least privilege.
2. Explicit role separation.
3. Audit important actions.
4. Preserve consent records.
5. Separate promotional permissions from rights ownership.
6. Never silently assign masters, publishing or catalogue ownership to ALLEGRO-VIBEZ.
7. Keep regulated financial functions separate from platform technology until the required partner integrations and approvals exist.

## Artist Command Centre
The first authenticated workspace should expose:
- profile completion
- catalogue readiness
- EPK
- releases
- campaign status
- radio submissions
- festival opportunities
- chart performance
- audience growth
- bookings
- commercial opportunities
- tasks and next actions

## Legacy Artist Command Centre
The legacy workflow should expose:
- career history
- famous catalogue inventory
- rights verification status
- missing metadata/assets
- relaunch plan
- 90-day campaign
- reissue opportunities
- live revival opportunities
- sponsorship opportunities
- international market opportunities
- catalogue/commercial performance

## Service boundary
The public web application remains portable. Database, storage, authentication, payments, media delivery and external distribution integrations are adapters behind explicit interfaces. This permits migration between IZAKHONO-owned services and verified external providers without rewriting the business layer.

## Phase 1 commercial rule
Avoid royalty administration as a platform assumption. ALLEGRO-VIBEZ may promote, market, manage opportunities and support catalogue commercialisation, but rights administration, publishing administration, collection-society activity and master ownership require explicit agreements and verified integrations.

## Deployment
Production target:
GitHub source → IZAKHONO-owned compute → container → Caddy edge → allegrovibez.com.

The deployment must remain independently testable through `/healthz` and must not depend on Vercel for production operation.
