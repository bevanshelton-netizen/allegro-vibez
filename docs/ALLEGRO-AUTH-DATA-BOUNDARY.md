# ALLEGRO-VIBEZ Authentication & Data Boundary

## Rule
The browser is never the authority for identity, ownership, role or commercial state.

The authenticated server/session establishes the user identity. Role grants are explicit and auditable. Database authorization must independently enforce the same ownership/collaboration boundary.

## Role model
- `artist`
- `legacy_artist`
- `manager`
- `promoter`
- `venue`
- `radio`
- `festival`
- `brand`
- `admin`

A user may have more than one role. The active workspace is presentation state; it is not an authorization grant.

## Request flow
1. User authenticates.
2. Application resolves the authenticated user ID.
3. Server resolves explicit role grants.
4. Server returns the allowed workspace and capabilities.
5. Client renders the workspace.
6. Every database mutation is re-authorized at the database/service boundary.
7. Sensitive actions create audit events.

## Supabase implementation rules
- Use `raw_app_meta_data` only for authorization claims that genuinely belong in JWT claims; never use user-editable `raw_user_meta_data` for authorization.
- Prefer explicit role/grant tables for durable platform authorization and team collaboration.
- Enable RLS on exposed tables.
- Pair grants with ownership-aware RLS policies.
- Never expose `service_role` credentials to the browser.
- Do not use `SECURITY DEFINER` as a shortcut around authorization.
- Commercial states remain `proposed`, `pending`, `verified`, `settled`; pending money is never presented as settled income.

## Application adapter
The frontend will call a replaceable application service boundary such as:

`GET /api/me`

Expected response shape:

```json
{
  "userId": "authenticated-user-id",
  "roles": ["artist"],
  "activeRole": "artist",
  "capabilities": ["profile.read", "catalogue.write", "campaign.write"],
  "workspace": "artist"
}
```

The initial client role router is deliberately presentation-only until a verified authentication/data project is selected and connected.

## Production gate
The Command Centre must not be declared authenticated or production-ready until real authentication, role resolution, RLS enforcement, session handling and independent verification all pass.
