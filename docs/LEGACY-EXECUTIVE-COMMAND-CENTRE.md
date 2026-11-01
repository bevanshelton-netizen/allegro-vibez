# ALLEGRO-VIBEZ Legacy Artist Executive Command Centre

## Purpose

The Legacy Artist Executive Command Centre is the executive operating view for an artist's second-career relaunch. It consolidates readiness, execution, commercial opportunity and verified outcomes without treating pipeline activity as revenue or catalogue presence as rights ownership.

## Operating chain

Artist → Executive Command → 90-Day Plan → Campaign → Opportunities → Deal Room → Verified Outcomes → Performance Intelligence

## Executive signals

- Overall readiness
- Catalogue readiness
- Rights readiness
- Commercial readiness
- Execution completion
- Blocked execution work
- Verified outcomes
- Settled outcomes
- Active and confirmed opportunities
- Published campaign content
- Confirmed campaign targets
- Fan, media/radio/KORA and international signals
- Evidence gaps
- Next-best actions

## Evidence rules

1. Pipeline value is not income.
2. A proposal is not a deal.
3. A deal is not a verified settlement.
4. Catalogue presence is not ownership.
5. A prospect is not a partnership.
6. Rights-sensitive commercial use requires documented evidence and applicable agreements.
7. Royalty administration, publishing administration and master-rights assignment remain outside Phase 1 unless separately agreed and verified.

## Security

The command dashboard uses authenticated Supabase access and owner-scoped records. The executive dashboard RPC is restricted to authenticated users; anonymous execution is disabled.

## Front-end

`app/legacy-command.html` is the executive presentation layer. It reads verified intelligence through the authenticated dashboard RPC and existing RLS-protected records.

## Infrastructure principle

The command centre is application logic and can be hosted independently of the data layer. Production hosting remains subject to verified deployment and infrastructure availability; the repository commit alone is not treated as proof of public deployment.
