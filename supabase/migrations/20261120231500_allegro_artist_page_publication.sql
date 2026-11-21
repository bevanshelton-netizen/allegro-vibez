-- ALLEGRO ARTIST PAGES — publication boundary (proposal; NOT applied)
-- The private Artist OS records remain private. This migration introduces:
--   1) owner-controlled publication requests (never publicly readable);
--   2) a separate, explicitly approved public projection.
-- Apply only after reviewed in staging and approval of shared-project impact.

begin;

create table if not exists public.allegro_artist_page_requests (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.allegro_artists(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  requested_slug text not null,
  requested_public_data jsonb not null default '{}'::jsonb,
  consent_granted boolean not null default false,
  consent_version text,
  consented_at timestamptz,
  status text not null default 'draft'
    check (status in ('draft','submitted','withdrawal_requested','withdrawn','rejected')),
  review_note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint allegro_artist_page_requests_slug_format
    check (requested_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint allegro_artist_page_requests_consent
    check (
      (consent_granted = false and consented_at is null)
      or (consent_granted = true and consented_at is not null and consent_version is not null)
    ),
  constraint allegro_artist_page_requests_payload_object
    check (jsonb_typeof(requested_public_data) = 'object'),
  constraint allegro_artist_page_requests_submitted_consent
    check (
      status <> 'submitted'
      or (consent_granted = true and consented_at is not null and consent_version is not null)
    )
);

create index if not exists idx_allegro_artist_page_requests_owner
  on public.allegro_artist_page_requests(owner_id, updated_at desc);
create index if not exists idx_allegro_artist_page_requests_artist
  on public.allegro_artist_page_requests(artist_id, created_at desc);
create unique index if not exists idx_allegro_artist_page_requests_open_slug
  on public.allegro_artist_page_requests(requested_slug)
  where status in ('draft','submitted','withdrawal_requested');
create unique index if not exists idx_allegro_artist_page_requests_one_open_per_artist
  on public.allegro_artist_page_requests(artist_id)
  where status in ('draft','submitted','withdrawal_requested');

alter table public.allegro_artist_page_requests enable row level security;

drop policy if exists allegro_artist_page_requests_owner_select on public.allegro_artist_page_requests;
create policy allegro_artist_page_requests_owner_select
  on public.allegro_artist_page_requests for select to authenticated
  using (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.allegro_artists a
      where a.id = artist_id and a.owner_id = (select auth.uid())
    )
  );

drop policy if exists allegro_artist_page_requests_owner_insert on public.allegro_artist_page_requests;
create policy allegro_artist_page_requests_owner_insert
  on public.allegro_artist_page_requests for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.allegro_artists a
      where a.id = artist_id and a.owner_id = (select auth.uid())
    )
  );

drop policy if exists allegro_artist_page_requests_owner_update on public.allegro_artist_page_requests;
create policy allegro_artist_page_requests_owner_update
  on public.allegro_artist_page_requests for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.allegro_artists a
      where a.id = artist_id and a.owner_id = (select auth.uid())
    )
    and status in ('draft','submitted','withdrawal_requested','withdrawn')
  );

revoke all on table public.allegro_artist_page_requests from anon, public, authenticated;
-- Fail closed: browser roles receive no direct request-table privileges in this proposal.
-- Owner submission, editing, state transitions and withdrawal are handled by the
-- trusted Edge Function after it validates the user's Supabase Auth identity and ownership.
grant select, insert, update on table public.allegro_artist_page_requests to service_role;


-- Private append-only audit trail for the trusted publication workflow.
create table if not exists public.allegro_artist_page_audit_events (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.allegro_artists(id) on delete cascade,
  request_id uuid references public.allegro_artist_page_requests(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null
    check (event_type in ('submitted','withdrawal_requested','suspended','approved','published','rejected')),
  event_data jsonb not null default '{}'::jsonb
    check (jsonb_typeof(event_data) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists idx_allegro_artist_page_audit_artist
  on public.allegro_artist_page_audit_events(artist_id, created_at desc);

alter table public.allegro_artist_page_audit_events enable row level security;
revoke all on table public.allegro_artist_page_audit_events from public, anon, authenticated;
-- Trusted server-side workflow only; no browser-role access.
grant select, insert on table public.allegro_artist_page_audit_events to service_role;

-- Public projection contains only fields deliberately approved for publication.
-- Do not put owner IDs, emails, team, payment, contract, private notes, or storage
-- object paths here. Asset URLs must be independently approved public URLs.
create table if not exists public.allegro_artist_public_pages (
  artist_id uuid primary key references public.allegro_artists(id) on delete cascade,
  slug text not null unique,
  display_name text not null,
  tagline text,
  biography text,
  city text,
  country_code text,
  avatar_url text,
  banner_url text,
  music_links jsonb not null default '[]'::jsonb,
  social_links jsonb not null default '[]'::jsonb,
  events jsonb not null default '[]'::jsonb,
  press_items jsonb not null default '[]'::jsonb,
  publication_status text not null default 'unpublished'
    check (publication_status in ('unpublished','published','suspended')),
  artist_consent boolean not null default false,
  consent_version text,
  consented_at timestamptz,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint allegro_artist_public_pages_slug_format
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint allegro_artist_public_pages_json_arrays
    check (
      jsonb_typeof(music_links) = 'array'
      and jsonb_typeof(social_links) = 'array'
      and jsonb_typeof(events) = 'array'
      and jsonb_typeof(press_items) = 'array'
    ),
  constraint allegro_artist_public_pages_consent
    check (
      publication_status <> 'published'
      or (artist_consent = true and consented_at is not null and consent_version is not null
          and approved_at is not null and published_at is not null)
    )
);

create index if not exists idx_allegro_artist_public_pages_published
  on public.allegro_artist_public_pages(publication_status, slug);

alter table public.allegro_artist_public_pages enable row level security;

drop policy if exists allegro_artist_public_pages_public_read on public.allegro_artist_public_pages;
create policy allegro_artist_public_pages_public_read
  on public.allegro_artist_public_pages for select to anon, authenticated
  using (publication_status = 'published' and artist_consent = true);

revoke all on table public.allegro_artist_public_pages from anon, public, authenticated;
grant select, insert, update on table public.allegro_artist_public_pages to service_role;

-- Expose a fixed public column allowlist, never the underlying table. This prevents
-- approval metadata or future internal columns from becoming public by accident.
create or replace view public.allegro_artist_public_directory
with (security_barrier = true)
as
select
  slug,
  display_name,
  tagline,
  biography,
  city,
  country_code,
  avatar_url,
  banner_url,
  music_links,
  social_links,
  events,
  press_items,
  published_at,
  updated_at
from public.allegro_artist_public_pages
where publication_status = 'published'
  and artist_consent = true;

revoke all on table public.allegro_artist_public_directory from public, anon, authenticated;
grant select on table public.allegro_artist_public_directory to anon, authenticated;
-- No browser-role grants on either underlying table. The trusted publication service
-- writes only after owner consent and human review; clients read the allowlist view only.


-- Transactional owner submission: request + audit event commit or roll back together.
create or replace function public.allegro_submit_artist_page_request(
  p_artist_id uuid,
  p_owner_id uuid,
  p_requested_slug text,
  p_public_data jsonb,
  p_consent_version text,
  p_consented_at timestamptz
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $
declare
  v_request_id uuid;
  v_recent_submissions integer;
begin
  if p_owner_id is null or not exists (
    select 1 from public.allegro_artists a
    where a.id = p_artist_id and a.owner_id = p_owner_id
  ) then
    raise exception 'Artist ownership could not be verified.' using errcode = '42501';
  end if;

  if p_requested_slug is null
     or p_requested_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*
  'Private audit trail for trusted artist-page submission, review, publication and withdrawal events.';
comment on table public.allegro_artist_page_requests is
  'Private artist-owned requests to publish or withdraw an artist page; never publicly exposed.';
comment on table public.allegro_artist_public_pages is
  'Internal approved projection. Browser roles have no direct table privileges.';
comment on view public.allegro_artist_public_directory is
  'Public allowlist view: only published, consented artist fields; excludes internal IDs and approval metadata.';

commit;

     or p_public_data is null
     or jsonb_typeof(p_public_data) <> 'object'
     or p_consent_version is null
     or p_consent_version = ''
     or p_consented_at is null then
    raise exception 'Invalid artist publication request.' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.allegro_artist_page_requests r
    where r.artist_id = p_artist_id
      and r.status in ('draft','submitted','withdrawal_requested')
  ) then
    raise exception 'An artist-page request is already open.' using errcode = '23505';
  end if;

  select count(*)::integer into v_recent_submissions
  from public.allegro_artist_page_audit_events e
  where e.artist_id = p_artist_id
    and e.event_type = 'submitted'
    and e.created_at >= now() - interval '24 hours';

  if v_recent_submissions >= 5 then
    raise exception 'Artist-page submission limit reached.' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.allegro_artist_public_pages p
    where p.slug = p_requested_slug and p.artist_id <> p_artist_id
  ) then
    raise exception 'That public artist slug is already in use.' using errcode = '23505';
  end if;

  insert into public.allegro_artist_page_requests (
    artist_id, owner_id, requested_slug, requested_public_data,
    consent_granted, consent_version, consented_at, status, submitted_at
  ) values (
    p_artist_id, p_owner_id, p_requested_slug, p_public_data,
    true, p_consent_version, p_consented_at, 'submitted', now()
  )
  returning id into v_request_id;

  insert into public.allegro_artist_page_audit_events (
    artist_id, request_id, actor_id, event_type, event_data
  ) values (
    p_artist_id, v_request_id, p_owner_id, 'submitted',
    jsonb_build_object('channel', 'artist-page-request-edge-function')
  );

  return v_request_id;
end;
$;

-- Transactional withdrawal immediately suspends a live public projection.
create or replace function public.allegro_withdraw_artist_page(
  p_artist_id uuid,
  p_owner_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $
declare
  v_request_id uuid;
  v_suspended_count integer := 0;
begin
  if p_owner_id is null or not exists (
    select 1 from public.allegro_artists a
    where a.id = p_artist_id and a.owner_id = p_owner_id
  ) then
    raise exception 'Artist ownership could not be verified.' using errcode = '42501';
  end if;

  update public.allegro_artist_page_requests
  set status = 'withdrawn',
      consent_granted = false,
      consent_version = null,
      consented_at = null,
      updated_at = now()
  where artist_id = p_artist_id
    and owner_id = p_owner_id
    and status in ('draft','submitted','withdrawal_requested')
  returning id into v_request_id;

  update public.allegro_artist_public_pages
  set publication_status = 'suspended',
      artist_consent = false,
      updated_at = now()
  where artist_id = p_artist_id
    and publication_status = 'published';

  get diagnostics v_suspended_count = row_count;

  insert into public.allegro_artist_page_audit_events (
    artist_id, request_id, actor_id, event_type, event_data
  ) values (
    p_artist_id, v_request_id, p_owner_id, 'withdrawal_requested',
    jsonb_build_object('channel', 'artist-page-request-edge-function')
  );

  if v_suspended_count > 0 then
    insert into public.allegro_artist_page_audit_events (
      artist_id, request_id, actor_id, event_type, event_data
    ) values (
      p_artist_id, v_request_id, p_owner_id, 'suspended',
      jsonb_build_object('reason', 'artist_consent_withdrawn')
    );
  end if;

  return jsonb_build_object(
    'status', 'withdrawn',
    'public_page_suspended', v_suspended_count > 0
  );
end;
$;

revoke all on function public.allegro_submit_artist_page_request(uuid, uuid, text, jsonb, text, timestamptz) from public, anon, authenticated;
revoke all on function public.allegro_withdraw_artist_page(uuid, uuid) from public, anon, authenticated;
grant execute on function public.allegro_submit_artist_page_request(uuid, uuid, text, jsonb, text, timestamptz) to service_role;
grant execute on function public.allegro_withdraw_artist_page(uuid, uuid) to service_role;
grant select on table public.allegro_artists to service_role;

comment on table public.allegro_artist_page_audit_events is
  'Private audit trail for trusted artist-page submission, review, publication and withdrawal events.';
comment on table public.allegro_artist_page_requests is
  'Private artist-owned requests to publish or withdraw an artist page; never publicly exposed.';
comment on table public.allegro_artist_public_pages is
  'Internal approved projection. Browser roles have no direct table privileges.';
comment on view public.allegro_artist_public_directory is
  'Public allowlist view: only published, consented artist fields; excludes internal IDs and approval metadata.';

commit;
