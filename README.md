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

## Production architecture
The public site is a static frontend. The repository deliberately avoids unnecessary runtime dependencies so the production build remains portable across owned infrastructure and external hosting fallbacks.

The Docker image serves the complete public asset set, including SEO discovery files.

## Important launch rule
Production is not declared live merely because code exists or a deployment is created. The actual public HTTPS route and health check must pass before a release is considered verified.

## Future integrations
Radio streaming, creator accounts, commerce/payment processing, artist services and other platform capabilities should only be marked live after their real integrations and credentials have been connected and verified.

Canonical contact: contact@allegrovibez.com
