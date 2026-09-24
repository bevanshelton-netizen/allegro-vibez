# ALLEGRO-VIBEZ v6 — Launch Readiness Gate

This release is a **staging candidate**, not a declaration that external distribution, banking, billing or AI providers are live.

## Gate 1 — Environment
- Development, staging and production Supabase projects are separate.
- Only public client configuration is present in the frontend environment.
- Service-role keys and provider secrets are server-side only.
- Email verification and password recovery URLs are configured for the staging hostname.

## Gate 2 — Database and storage
- Apply migrations 001 through 006 in order to a staging database.
- Verify RLS with two different artist accounts and one fan account.
- Verify private master audio cannot be anonymously read.
- Verify signed media links expire.
- Verify a creator cannot read or mutate another creator's drafts.

## Gate 3 — Core journey
1. Register and verify email.
2. Complete artist onboarding.
3. Upload artwork/audio and save draft.
4. Re-open draft from My Music.
5. Submit release for moderation.
6. Moderator requests changes; artist revises.
7. Moderator approves/publishes with a reason.
8. Published release appears in discovery.
9. Playback produces the documented stream event.
10. Takedown/removal hides content without deleting legal/audit history.

## Gate 4 — Copyright and risk
- Submit a copyright case as an authenticated user.
- Confirm another normal user cannot read the case.
- Moderator actions require a reason and create audit logs.
- Risk flags are staff-only and cannot be silently cleared by creators.

## Gate 5 — Money
- Do not enable real payouts until KYC/banking provider integration is complete.
- Wallet totals must reconcile to immutable ledger entries.
- Duplicate payout reservation tests must pass.
- Billing status changes must originate from verified server-side provider events.

## Gate 6 — Operations
- Run `npm run verify:all`.
- Run `npm run verify:v6`.
- Complete backup and restore drill documented in `BACKUP_RESTORE_RUNBOOK.md`.
- Configure external uptime, error and database alerts.
- Review the System Health page for unexpected operational events.

## Sign-off
Production go-live requires product, engineering/security and operations sign-off. Distribution, payments and payouts remain disabled until their provider-specific staging tests pass.
