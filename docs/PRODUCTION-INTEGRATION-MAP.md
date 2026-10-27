# ALLEGRO-VIBEZ Production Integration Map

The clean rebuild deliberately separates the product experience from vendor infrastructure. This document defines the production boundaries that must be implemented before each capability is called live.

## 1. Identity and accounts

**Needed:** server-side authentication, verified email/phone flows, sessions, account recovery, role-based authorization, artist/fan profiles.

**Acceptance:** a user can create an account, authenticate, recover access, update a profile and have authorization enforced server-side.

## 2. Music and media

**Needed:** private media ingestion, object storage, metadata database, transcoding/validation, signed delivery URLs, moderation and takedown controls.

**Acceptance:** an authorized creator can upload an owned/licensed recording, metadata is persisted, media is validated, and an authorized listener can stream it.

## 3. Rights and ownership

**Needed:** contributor records, split agreements, immutable/auditable ownership events, territory/version handling and dispute workflow.

**Acceptance:** every release has explicit ownership data and changes are auditable. No royalty amount is treated as final without a verified accounting event.

## 4. Earnings and payments

**Needed:** payment provider integration, webhook verification, internal ledger, reconciliation, refunds/chargebacks, payout eligibility and regulated-partner boundaries where applicable.

**Acceptance:** payment events are authenticated server-side and reconciled to an auditable ledger. Pending, available and paid states remain distinct.

## 5. Community and messaging

**Needed:** authenticated posting, moderation, abuse reporting, rate limits, notification delivery and privacy controls.

**Acceptance:** users can publish and interact within enforced authorization and moderation boundaries.

## 6. Marketplace

**Needed:** product/catalogue service, inventory/order records, payment checkout, fulfilment integration and refunds.

**Acceptance:** an order cannot be marked paid or fulfilled solely by browser state.

## 7. Opportunities and collaboration

**Needed:** opportunity listings, applications, collaboration permissions, contracts/agreements and notifications.

**Acceptance:** creators can apply and track status, while private opportunity and application data remains access-controlled.

## 8. Distribution

**Needed:** explicit integrations with licensed distribution/DSP partners, release metadata mapping, delivery status, takedown and reporting APIs.

**Acceptance:** distribution status is derived from verified provider responses. No provider connection is represented as active without successful authentication and end-to-end verification.

## 9. Infrastructure

**Primary direction:** portable, owned-first infrastructure. The application core must remain deployable independently of any single hosting provider.

**Requirements:** TLS, DNS, backups, observability, secrets management, database backups, object-storage durability, disaster recovery and documented rollback.

External hosting may be used as a reversible fallback, never as an architectural dependency.

## 10. Production gate

A capability may be labelled **LIVE** only after:

1. implementation exists;
2. authentication/authorization is enforced;
3. production credentials are securely configured;
4. the real external service responds successfully;
5. the critical workflow passes end-to-end testing;
6. failure and retry behaviour is tested;
7. audit/reconciliation records are verified; and
8. monitoring and rollback are documented.

Until then, the product must use precise labels such as **Demo**, **Ready for integration**, or **Not connected**.
