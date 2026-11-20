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

revoke all on table public.allegro_artist_page_requests from anon, public;
grant select, insert, update on table public.allegro_artist_page_requests to authenticated;

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
grant select on table public.allegro_artist_public_pages to anon, authenticated;
-- No browser-role write grants or policies on the public projection.
-- Trusted publication service writes only after owner consent and human review.

comment on table public.allegro_artist_page_requests is
  'Private artist-owned requests to publish or withdraw an artist page; never publicly exposed.';
comment on table public.allegro_artist_public_pages is
  'Approved public projection only. Public SELECT is limited to published pages with recorded artist consent.';

commit;
