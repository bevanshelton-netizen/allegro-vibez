-- ALLEGRO-VIBEZ CORE DATA MODEL v1
-- Portable PostgreSQL reference schema.
-- Rights and financial states are deliberately explicit.

create extension if not exists pgcrypto;

create table if not exists artists (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  artist_type text not null check (artist_type in ('emerging','rising','legacy','managed','independent')),
  country_code text,
  bio text,
  status text not null default 'draft' check (status in ('draft','active','paused','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists releases (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references artists(id),
  title text not null,
  release_type text not null check (release_type in ('single','ep','album','compilation','reissue','live')),
  release_date date,
  status text not null default 'draft' check (status in ('draft','review','approved','released','archived')),
  created_at timestamptz not null default now()
);

create table if not exists tracks (
  id uuid primary key default gen_random_uuid(),
  release_id uuid references releases(id),
  artist_id uuid not null references artists(id),
  title text not null,
  isrc text,
  duration_seconds integer,
  catalogue_status text not null default 'unverified' check (catalogue_status in ('unverified','rights_review','cleared','restricted')),
  created_at timestamptz not null default now()
);

create table if not exists rights_declarations (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references artists(id),
  track_id uuid references tracks(id),
  declaration_type text not null check (declaration_type in ('master','publishing','performance','promotional','licensing')),
  status text not null default 'pending' check (status in ('pending','verified','rejected','expired')),
  evidence_reference text,
  declared_at timestamptz not null default now(),
  verified_at timestamptz
);

create table if not exists chart_periods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  period_type text not null check (period_type in ('weekly','monthly','annual')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'open' check (status in ('planned','open','locked','published')),
  methodology_version text not null
);

create table if not exists chart_entries (
  id uuid primary key default gen_random_uuid(),
  chart_period_id uuid not null references chart_periods(id),
  track_id uuid not null references tracks(id),
  rank integer,
  score numeric(12,4),
  created_at timestamptz not null default now(),
  unique(chart_period_id, track_id)
);

create table if not exists chart_snapshots (
  id uuid primary key default gen_random_uuid(),
  chart_period_id uuid not null unique references chart_periods(id),
  snapshot jsonb not null,
  snapshot_hash text not null,
  published_at timestamptz not null default now()
);

create table if not exists radio_opportunities (
  id uuid primary key default gen_random_uuid(),
  station_name text not null,
  country_code text,
  genre text,
  status text not null default 'prospect' check (status in ('prospect','submitted','confirmed','closed','declined')),
  contact_reference text,
  created_at timestamptz not null default now()
);

create table if not exists festival_opportunities (
  id uuid primary key default gen_random_uuid(),
  festival_name text not null,
  country_code text,
  genre text,
  deadline date,
  status text not null default 'prospect' check (status in ('prospect','applied','shortlisted','confirmed','closed','declined')),
  created_at timestamptz not null default now()
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_releases_artist on releases(artist_id);
create index if not exists idx_tracks_artist on tracks(artist_id);
create index if not exists idx_chart_entries_period on chart_entries(chart_period_id);
create index if not exists idx_rights_track on rights_declarations(track_id);
create index if not exists idx_audit_entity on audit_events(entity_type, entity_id);
