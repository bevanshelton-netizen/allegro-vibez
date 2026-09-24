-- ALLEGRO-VIBEZ Version 1 baseline
-- Run in the Supabase SQL editor for a fresh project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  display_name text,
  country text,
  role text not null default 'artist' check (role in ('artist','fan','manager','label','moderator','admin','super_admin','finance_admin')),
  status text not null default 'active' check (status in ('active','suspended','closed')),
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artist_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  stage_name text not null,
  slug text not null unique,
  biography text not null default '',
  genres text[] not null default '{}',
  location text,
  website text,
  profile_path text,
  banner_path text,
  is_public boolean not null default true,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','pending','verified','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.releases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  creator_name text not null,
  release_type text not null default 'Single',
  genre text,
  subgenre text,
  language text,
  release_date date,
  original_release_date date,
  artwork_path text,
  explicit_content boolean not null default false,
  rights_confirmed boolean not null default false,
  copyright_line text,
  phonographic_line text,
  status text not null default 'draft' check (status in ('draft','uploading','processing','ready','submitted','changes_requested','approved','rejected','withdrawn','published','takedown_pending','removed')),
  moderation_reason text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  version text,
  primary_artist text not null,
  audio_path text,
  audio_file_name text,
  isrc text,
  duration_seconds numeric,
  sample_rate integer,
  bit_depth integer,
  file_size bigint,
  checksum text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.release_tracks (
  release_id uuid not null references public.releases(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  track_order integer not null default 1,
  primary key (release_id, track_id)
);

create table if not exists public.rights_declarations (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  ownership_confirmed boolean not null default false,
  declaration_text text not null,
  terms_version text not null default '1.0',
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.artist_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  artist_id uuid not null references public.artist_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, artist_id)
);

create table if not exists public.track_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, track_id)
);

create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null unique,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.playlist_items (
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  position integer not null,
  added_at timestamptz not null default now(),
  primary key (playlist_id, track_id)
);

create table if not exists public.stream_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  track_id uuid not null references public.tracks(id) on delete cascade,
  session_id uuid,
  seconds_played numeric not null default 0,
  qualified boolean not null default false,
  suspicious boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  currency text not null default 'ZAR',
  pending_balance numeric(14,2) not null default 0,
  available_balance numeric(14,2) not null default 0,
  on_hold_balance numeric(14,2) not null default 0,
  paid_lifetime numeric(14,2) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(id) on delete restrict,
  amount numeric(14,2) not null,
  direction text not null check (direction in ('credit','debit')),
  transaction_type text not null,
  reference text,
  created_at timestamptz not null default now()
);

create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'ZAR',
  status text not null default 'requested' check (status in ('requested','review','approved','processing','paid','failed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.moderation_cases (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  status text not null default 'open',
  assigned_to uuid references public.profiles(id) on delete set null,
  decision text,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null default 'system',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name',''),
    case when new.raw_user_meta_data->>'role' in ('artist','fan','manager','label') then new.raw_user_meta_data->>'role' else 'artist' end
  ) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values
  ('artwork','artwork',false,10485760,array['image/jpeg','image/png','image/webp']),
  ('music','music',false,524288000,array['audio/wav','audio/flac','audio/mpeg']),
  ('profiles','profiles',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public;

alter table public.profiles enable row level security;
alter table public.artist_profiles enable row level security;
alter table public.releases enable row level security;
alter table public.tracks enable row level security;
alter table public.release_tracks enable row level security;
alter table public.rights_declarations enable row level security;
alter table public.audit_logs enable row level security;
alter table public.artist_follows enable row level security;
alter table public.track_likes enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_items enable row level security;
alter table public.stream_events enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.payout_requests enable row level security;
alter table public.moderation_cases enable row level security;
alter table public.notifications enable row level security;

create or replace function public.current_role()
returns text language sql stable security definer set search_path=public as $$
  select role from public.profiles where id = auth.uid();
$$;

drop policy if exists "profile self read" on public.profiles;
create policy "profile self read" on public.profiles for select using (id = auth.uid() or public.current_role() in ('admin','super_admin','moderator'));
drop policy if exists "profile self update" on public.profiles;
create policy "profile self update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "artist public read" on public.artist_profiles;
create policy "artist public read" on public.artist_profiles for select using (is_public = true or user_id = auth.uid() or public.current_role() in ('admin','super_admin','moderator'));
drop policy if exists "artist owner insert" on public.artist_profiles;
create policy "artist owner insert" on public.artist_profiles for insert with check (user_id = auth.uid());
drop policy if exists "artist owner update" on public.artist_profiles;
create policy "artist owner update" on public.artist_profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "release owner read" on public.releases;
create policy "release owner read" on public.releases for select using (user_id = auth.uid() or status = 'published' or public.current_role() in ('admin','super_admin','moderator'));
drop policy if exists "release owner insert" on public.releases;
create policy "release owner insert" on public.releases for insert with check (user_id = auth.uid());
drop policy if exists "release owner update" on public.releases;
create policy "release owner update" on public.releases for update using (user_id = auth.uid() or public.current_role() in ('admin','super_admin','moderator'));
drop policy if exists "release owner delete" on public.releases;
create policy "release owner delete" on public.releases for delete using (user_id = auth.uid() and status in ('draft','changes_requested'));

drop policy if exists "track owner read" on public.tracks;
create policy "track owner read" on public.tracks for select using (user_id = auth.uid() or public.current_role() in ('admin','super_admin','moderator') or exists(select 1 from public.release_tracks rt join public.releases r on r.id=rt.release_id where rt.track_id=tracks.id and r.status='published'));
drop policy if exists "track owner insert" on public.tracks;
create policy "track owner insert" on public.tracks for insert with check (user_id = auth.uid());
drop policy if exists "track owner update" on public.tracks;
create policy "track owner update" on public.tracks for update using (user_id = auth.uid());
drop policy if exists "track owner delete" on public.tracks;
create policy "track owner delete" on public.tracks for delete using (user_id = auth.uid());

drop policy if exists "release track owner all" on public.release_tracks;
create policy "release track owner all" on public.release_tracks for all using (exists(select 1 from public.releases r where r.id=release_id and (r.user_id=auth.uid() or r.status='published' or public.current_role() in ('admin','super_admin','moderator')))) with check (exists(select 1 from public.releases r where r.id=release_id and r.user_id=auth.uid()));

drop policy if exists "rights owner all" on public.rights_declarations;
create policy "rights owner all" on public.rights_declarations for all using (user_id=auth.uid() or public.current_role() in ('admin','super_admin','moderator')) with check (user_id=auth.uid());

drop policy if exists "follows visible" on public.artist_follows;
create policy "follows visible" on public.artist_follows for select using (true);
drop policy if exists "follows self write" on public.artist_follows;
create policy "follows self write" on public.artist_follows for all using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists "likes self all" on public.track_likes;
create policy "likes self all" on public.track_likes for all using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists "playlists privacy read" on public.playlists;
create policy "playlists privacy read" on public.playlists for select using (is_public=true or user_id=auth.uid());
drop policy if exists "playlists self write" on public.playlists;
create policy "playlists self write" on public.playlists for all using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists "playlist items access" on public.playlist_items;
create policy "playlist items access" on public.playlist_items for all using (exists(select 1 from public.playlists p where p.id=playlist_id and (p.user_id=auth.uid() or p.is_public=true))) with check (exists(select 1 from public.playlists p where p.id=playlist_id and p.user_id=auth.uid()));

drop policy if exists "wallet owner read" on public.wallets;
create policy "wallet owner read" on public.wallets for select using (user_id=auth.uid() or public.current_role() in ('finance_admin','super_admin'));
drop policy if exists "transactions owner read" on public.wallet_transactions;
create policy "transactions owner read" on public.wallet_transactions for select using (exists(select 1 from public.wallets w where w.id=wallet_id and (w.user_id=auth.uid() or public.current_role() in ('finance_admin','super_admin'))));
drop policy if exists "payout owner read" on public.payout_requests;
create policy "payout owner read" on public.payout_requests for select using (user_id=auth.uid() or public.current_role() in ('finance_admin','super_admin'));
drop policy if exists "payout owner insert" on public.payout_requests;
create policy "payout owner insert" on public.payout_requests for insert with check (user_id=auth.uid());

drop policy if exists "moderation admin" on public.moderation_cases;
create policy "moderation admin" on public.moderation_cases for all using (public.current_role() in ('moderator','admin','super_admin')) with check (public.current_role() in ('moderator','admin','super_admin'));
drop policy if exists "audit admin read" on public.audit_logs;
create policy "audit admin read" on public.audit_logs for select using (public.current_role() in ('admin','super_admin','moderator','finance_admin'));
drop policy if exists "audit admin insert" on public.audit_logs;
create policy "audit admin insert" on public.audit_logs for insert with check (actor_id=auth.uid() and public.current_role() in ('admin','super_admin','moderator','finance_admin'));

drop policy if exists "notifications owner" on public.notifications;
create policy "notifications owner" on public.notifications for select using (user_id=auth.uid());
create policy "notifications owner update" on public.notifications for update using (user_id=auth.uid());

drop policy if exists "artwork owner select" on storage.objects;
create policy "artwork owner select" on storage.objects for select using (bucket_id='artwork' and ((storage.foldername(name))[1]=auth.uid()::text or public.current_role() in ('admin','super_admin','moderator')));
drop policy if exists "artwork owner insert" on storage.objects;
create policy "artwork owner insert" on storage.objects for insert with check (bucket_id='artwork' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "artwork owner delete" on storage.objects;
create policy "artwork owner delete" on storage.objects for delete using (bucket_id='artwork' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "music owner select" on storage.objects;
create policy "music owner select" on storage.objects for select using (bucket_id='music' and ((storage.foldername(name))[1]=auth.uid()::text or public.current_role() in ('admin','super_admin','moderator')));
drop policy if exists "music owner insert" on storage.objects;
create policy "music owner insert" on storage.objects for insert with check (bucket_id='music' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "music owner delete" on storage.objects;
create policy "music owner delete" on storage.objects for delete using (bucket_id='music' and (storage.foldername(name))[1]=auth.uid()::text);
