# ALLEGRO-VIBEZ — Operations Baseline

## Release gate

A release is ready only when code checks pass, the intended environment is identified, secrets are supplied through secure runtime configuration, and the critical user journeys have been tested end-to-end.

## Minimum production controls

- HTTPS with automatic certificate renewal.
- Daily encrypted database backups with restore testing.
- Object/media storage backups or replication appropriate to the media policy.
- Structured application logs without passwords, tokens or payment credentials.
- Health endpoint for process and dependency checks.
- Error monitoring with actionable alerts.
- Rate limiting for authentication, uploads, community posting and payment initiation.
- Database migrations recorded and reversible where practical.
- Deployment rollback procedure documented before public launch.
- Separate development, staging and production credentials.
- Administrative actions recorded in an audit trail.

## Incident response

1. Stop or isolate the affected capability.
2. Preserve logs and audit records.
3. Rotate compromised credentials when applicable.
4. Assess customer, creator and rights/financial impact.
5. Restore the smallest safe version or roll back.
6. Verify integrity and critical journeys.
7. Document root cause and corrective action.

## Hosting principle

ALLEGRO-VIBEZ remains portable. Hosting is an implementation detail, not a product dependency. The preferred production path is IZAKHONO-owned infrastructure where available; external infrastructure may be used as a reversible fallback. No provider-specific feature should become a hard architectural dependency.

## Current rebuild boundary

The clean branch is a functional static product foundation with local demo state. It does not yet claim production identity, live media storage/transcoding, royalty settlement, payment processing, regulated custody, or DSP distribution. Those capabilities require secure server-side integrations and the production gate in `docs/PRODUCTION-INTEGRATION-MAP.md`.
