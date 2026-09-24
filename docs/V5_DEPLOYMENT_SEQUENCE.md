# ALLEGRO-VIBEZ v5 deployment sequence

v5 adds the fan/privacy/support layer and expands auditable operations. Apply only after v1-v4 migrations have been reconciled with the target project.

## 1. Database
1. Back up the target Supabase database.
2. Review `005_fan_admin_support.sql` against existing tables and policies.
3. Apply in staging first.
4. Confirm RLS is enabled on `fan_profiles`, `blocks`, `support_tickets`, `risk_flags`, and `copyright_cases`.

## 2. Fan acceptance flow
1. Sign in as a normal user.
2. Open `/settings/privacy`, save a fan username and privacy state.
3. Open `/me/playlists`, create private and public playlists.
4. Confirm anonymous users cannot read private playlists.
5. Confirm a public playlist loads at `/playlist/:slug`.
6. Confirm listening history contains only the signed-in user's events.

## 3. Cross-account checks
- User A cannot edit User B's fan profile.
- User A cannot modify User B's playlists or playlist items.
- User A cannot read User B's private playlist.
- User A cannot read User B's support ticket.
- Normal users cannot read `risk_flags` or the global support queue.

## 4. Admin/support checks
1. Assign a staging-only `support` role to a trusted test account using an administrative database path.
2. Verify `/admin/support` can read and update support cases.
3. Verify non-support users are rejected by route protection and RLS.
4. Verify `/admin/audit` is restricted to admin/super_admin.

## 5. Go-live rule
Do not mark Sprint 9 or Admin Support complete until cross-account tests pass. Do not enable live payments, payouts, or DSP delivery before staging sign-off.
