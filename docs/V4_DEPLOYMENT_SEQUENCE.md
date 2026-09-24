# ALLEGRO-VIBEZ V4 Deployment Sequence

This pass is additive. Do not run migrations blindly against an existing Supabase database.

1. Back up the current Supabase database and export bucket policies.
2. Apply migrations 001-003 only if they have not already been reconciled with the target project.
3. Review and apply `004_finance_distribution_ai.sql` in staging.
4. Run `npm run verify:all` locally.
5. Test creator wallet with a zero balance; confirm no fabricated funds appear.
6. Insert a controlled staging ledger credit, reconcile wallet balances, then request a payout below available balance.
7. Repeat the same payout call with the same idempotency key and confirm only one reservation exists.
8. Attempt a payout above available balance and confirm it is blocked.
9. Approve a staging release through moderation.
10. As admin/moderator, create a distribution order and verify all store targets are created once.
11. Change one target to live and confirm the order becomes `live_partial`; mark all live and confirm the order becomes `live`.
12. Confirm the creator can read distribution status but cannot update target statuses.
13. Open Billing and confirm no frontend card/bank collection exists.
14. Open AI Creator Suite and confirm no external request is transmitted in V4.
15. Run cross-account tests: Artist A cannot read Artist B wallet, payouts, private catalogue or distribution records.
16. Only after staging sign-off connect real payment, payout, DSP and AI providers through trusted server-side functions.
