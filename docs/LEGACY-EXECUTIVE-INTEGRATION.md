# Legacy Executive Integration

## Purpose

The Legacy Artist Executive Command Centre is the management control surface for an established artist's second-career programme.

## Entry point

The Artist OS should expose the Legacy Executive workspace when the authenticated account has a legacy artist, manager, or administrator role.

Primary workspace:

`/app/legacy-command.html`

## Operating chain

Artist → Executive Command → 90-Day Recovery Plan → Campaign → Outreach → Opportunity → Deal Room → Verified Outcome → Performance Snapshot

## Integration rules

- Read verified operating records; do not invent metrics.
- Never represent pipeline value as received income.
- Never infer rights ownership from catalogue presence.
- Never represent a prospect as a partnership.
- Rights-sensitive commercial actions require documented evidence and explicit agreements.
- Royalty/publishing administration and master-rights assignment remain outside the initial operating model unless separately agreed and verified.
- Authentication and row-level security remain mandatory.

## Executive navigation

The main Artist OS remains the artist's everyday workspace. The Legacy Executive Command Centre is the management-grade control surface for approved legacy revival programmes.

The integration should surface a clear Legacy/Revival entry point from Artist OS for eligible accounts while keeping emerging-artist workflows separate.

## Data sources

The command centre consumes the existing authenticated Supabase RPC/data model, including readiness scores, execution tasks, command actions, opportunities, catalogue records, verified outcomes and performance snapshots.

No additional public Edge Function is required for this integration.
