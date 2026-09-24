# ALLEGRO-VIBEZ — Backup & Restore Runbook

## Objective
Demonstrate that catalogue, identity, rights, audit and finance records can be restored without relying on hope or undocumented manual steps.

## Before launch
1. Enable the backup capability appropriate to the Supabase plan.
2. Record database region, project reference and responsible operators in the private operations register.
3. Export migration files and application release tag together.
4. Maintain a separately protected copy of critical configuration metadata (never plaintext provider secrets in the repository).

## Restore drill
1. Create an isolated recovery/staging project.
2. Restore the latest approved database backup or point-in-time snapshot.
3. Apply any migrations newer than the snapshot in numeric order.
4. Recreate/verify required storage buckets and policies.
5. Verify authentication redirect configuration.
6. Run structural/security/v6 verification scripts.
7. Test one known artist profile, one release, one moderation case and one ledger record.
8. Confirm audit history remains intact.
9. Record recovery time and recovery-point result.

## Failure criteria
The drill fails if records are missing, ownership/RLS changes, financial history becomes editable, private media becomes public, or audit events cannot be reconstructed.

## Production incident rule
Never overwrite the only damaged production environment during recovery. Restore into an isolated target, validate, then perform a controlled cutover.
