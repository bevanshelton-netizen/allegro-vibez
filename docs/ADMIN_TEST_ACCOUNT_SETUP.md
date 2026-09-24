# Admin test account setup

The moderation UI is intentionally inaccessible to ordinary artist accounts.

For staging, create a separate Supabase Auth user for moderation. Then, from the Supabase SQL Editor while operating as the trusted project owner, assign that user's profile role explicitly:

```sql
update public.profiles
set role = 'moderator', updated_at = now()
where id = '<AUTH-USER-UUID>';
```

Use `admin` or `super_admin` only when the account genuinely needs those broader powers. Do not change the artist account used to upload releases into an admin account just to make testing easier.

After the staff account signs in, open:

- `/admin` for the operations overview
- `/admin/releases` for release review

The current artist-submitted test release should appear when its status is `submitted`.
