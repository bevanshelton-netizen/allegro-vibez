# ALLEGRO-VIBEZ — Rebuild Architecture

## Product
ALLEGRO-VIBEZ is a global artist prosperity platform. The public brand experience is only the front door.

## First release sequence
1. Brand and public experience
2. Account identity and profiles
3. Artist onboarding
4. Music catalogue and listening
5. Creator workspace
6. Fan/community layer
7. Rights and ownership records
8. Earnings and payments
9. Opportunities and collaboration
10. Global distribution integrations

## Architecture rules
- Start with a small, coherent core.
- Keep domain logic independent from hosting vendors.
- Never put private credentials in browser code.
- Every external integration must have a real verification boundary.
- Every financial/rights record must be auditable.
- Design APIs so infrastructure can move without rebuilding the product.
- Mobile-first, responsive, accessible and resilient on slower connections.

## What is deliberately absent
The previous implementation's Creator OS, distribution gateway, provider lifecycle, merch storefront, Vercel-specific launch assumptions and deployment experiments are not part of this initial foundation.

They may only return later if they are justified by the original product requirements and rebuilt correctly.
