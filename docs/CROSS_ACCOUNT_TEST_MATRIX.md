# ALLEGRO-VIBEZ — Cross-Account Security Test Matrix

Use at least: Artist A, Artist B, Fan A, Moderator, Support, Finance Admin, Super Admin.

| Test | Expected |
|---|---|
| Artist A reads Artist B draft release | Denied |
| Artist A edits Artist B profile | Denied |
| Anonymous visitor reads draft audio master | Denied |
| Fan reads private playlist belonging to another fan | Denied |
| Artist changes own role to admin | Denied |
| Moderator approves release without reason | Denied |
| Support agent reads finance-only records | Denied |
| Finance admin edits creative metadata | Denied |
| Claimant reads another user's copyright case | Denied |
| Creator clears own risk flag | Denied |
| Replayed payout request reserves funds twice | Denied |
| Repeated provider webhook creates duplicate transaction | Denied |
| Removed release remains discoverable | Denied |
| Published approved release is discoverable | Allowed |

Record evidence for every result before staging sign-off.
