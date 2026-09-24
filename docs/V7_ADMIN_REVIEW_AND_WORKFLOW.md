# ALLEGRO-VIBEZ v7 — Admin Review & Workflow Hardening

This build completes the first production-shaped release moderation loop.

## What changed

- Added `/admin/releases` as a dedicated moderation workspace.
- Moderators can inspect artwork, playable master audio, metadata, track identifiers, rights declaration and owner identity before deciding.
- Approve, request-changes and reject decisions require a meaningful reason.
- Decisions run through the privileged `moderate_release` RPC and create audit history.
- The release owner receives an in-app moderation notification.
- Direct authenticated updates to workflow columns (`status`, `moderation_reason`, `published_at`) are removed; artists retain metadata editing permissions only.
- Submission reuses an open moderation case instead of creating duplicate cases.
- The artist dashboard now detects actual profile completeness instead of permanently showing the completion banner.
- My Music labels submitted releases as Pending Review and permits changes-requested releases to be resubmitted.

## Apply to an existing Supabase project

Run `supabase/migrations/007_moderation_release_controls.sql` only after reviewing that migrations 001–006 (or equivalent schema) are already present. This is additive but it changes authenticated column-level update privileges on `releases` and `tracks`.

## End-to-end acceptance path

1. Artist creates a complete profile.
2. Artist creates a release draft with artwork, audio and rights declaration.
3. Artist submits the release; status becomes `submitted`.
4. An authorised moderator opens `/admin/releases`.
5. Moderator inspects the evidence and records one of: `approved`, `changes_requested`, `rejected`.
6. The artist sees the resulting status in My Music and receives a notification.
7. If changes were requested, the artist can correct and resubmit without creating a duplicate open case.
8. An approved release may be published only through the privileged publishing transition. Approval and publication remain separate actions.

## Important operational rule

Do not make an artist account an admin simply to test moderation in production. Use a dedicated test/staff account whose `profiles.role` is assigned through a trusted database/admin process.
