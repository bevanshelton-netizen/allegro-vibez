# ALLEGRO-VIBEZ API Boundary

This directory defines the integration boundary for future ALLEGRO-VIBEZ services.

## Principles

- The public site remains dependency-free until a real backend is connected.
- No payment, streaming, authentication or creator data is represented as live without a verified provider integration.
- Secrets must never be committed to this repository.
- External services must remain replaceable behind a small API boundary.

## Planned service domains

- `/api/health` — service health/readiness
- `/api/artists` — creator discovery and profiles
- `/api/radio` — radio/programming metadata
- `/api/releases` — music/release discovery
- `/api/commerce` — future merchandise/payment integration
- `/api/creator` — future creator onboarding and growth services

These are architectural targets, not live endpoints yet.
