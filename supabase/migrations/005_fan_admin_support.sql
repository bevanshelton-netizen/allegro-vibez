-- ALLEGRO-VIBEZ v5: fan engagement, privacy, support and admin controls

create table if not exists public.fan_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  bio text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(blocker_id, blocked_user_id),
  check (blocker_id <> blocked_user_id)
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  category text not null default 'general',
  body text not null,
  status text not null default 'open' check (status in ('open','in_progress','waiting_user','resolved','closed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  assigned_to uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.risk_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  release_id uuid references public.releases(id) on delete set null,
  flag_type text not null,
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  details jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open','reviewing','cleared','confirmed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.copyright_cases (
  id uuid primary key default gen_random_uuid(),
  claimant_user_id uuid references auth.users(id) on delete set null,
  release_id uuid references public.releases(id) on delete set null,
  track_id uuid references public.tracks(id) on delete set null,
  claim_type text not null default 'ownership',
  statement text not null,
  status text not null default 'open' check (status in ('open','reviewing','changes_requested','resolved','rejected')),
  assigned_to uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fan_profiles enable row level security;
alter table public.blocks enable row level security;
alter table public.support_tickets enable row level security;
alter table public.risk_flags enable row level security;
alter table public.copyright_cases enable row level security;

drop policy if exists "fan profile owner select" on public.fan_profiles;
create policy "fan profile owner select" on public.fan_profiles for select to authenticated
using (user_id = auth.uid() or is_public = true);
drop policy if exists "fan profile public select" on public.fan_profiles;
create policy "fan profile public select" on public.fan_profiles for select to anon using (is_public = true);
drop policy if exists "fan profile owner insert" on public.fan_profiles;
create policy "fan profile owner insert" on public.fan_profiles for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "fan profile owner update" on public.fan_profiles;
create policy "fan profile owner update" on public.fan_profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "block owner all" on public.blocks;
create policy "block owner all" on public.blocks for all to authenticated using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

drop policy if exists "support owner select" on public.support_tickets;
create policy "support owner select" on public.support_tickets for select to authenticated using (user_id = auth.uid());
drop policy if exists "support owner insert" on public.support_tickets;
create policy "support owner insert" on public.support_tickets for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "copyright claimant select" on public.copyright_cases;
create policy "copyright claimant select" on public.copyright_cases for select to authenticated using (claimant_user_id = auth.uid());
drop policy if exists "copyright claimant insert" on public.copyright_cases;
create policy "copyright claimant insert" on public.copyright_cases for insert to authenticated with check (claimant_user_id = auth.uid());

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('moderator','admin','super_admin','support','finance_admin')
  );
$$;

revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;

drop policy if exists "staff support select" on public.support_tickets;
create policy "staff support select" on public.support_tickets for select to authenticated using (public.is_staff());
drop policy if exists "staff support update" on public.support_tickets;
create policy "staff support update" on public.support_tickets for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "staff copyright select" on public.copyright_cases;
create policy "staff copyright select" on public.copyright_cases for select to authenticated using (public.is_staff());
drop policy if exists "staff copyright update" on public.copyright_cases;
create policy "staff copyright update" on public.copyright_cases for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "staff risk select" on public.risk_flags;
create policy "staff risk select" on public.risk_flags for select to authenticated using (public.is_staff());
drop policy if exists "staff risk update" on public.risk_flags;
create policy "staff risk update" on public.risk_flags for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "playlist owner select" on public.playlists;
create policy "playlist owner select" on public.playlists for select to authenticated using (user_id = auth.uid() or is_public = true);
drop policy if exists "playlist public select" on public.playlists;
create policy "playlist public select" on public.playlists for select to anon using (is_public = true);
drop policy if exists "playlist owner insert" on public.playlists;
create policy "playlist owner insert" on public.playlists for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "playlist owner update" on public.playlists;
create policy "playlist owner update" on public.playlists for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "playlist owner delete" on public.playlists;
create policy "playlist owner delete" on public.playlists for delete to authenticated using (user_id = auth.uid());

drop policy if exists "playlist item read" on public.playlist_items;
create policy "playlist item read" on public.playlist_items for select to authenticated using (
  exists (select 1 from public.playlists p where p.id = playlist_id and (p.user_id = auth.uid() or p.is_public = true))
);
drop policy if exists "playlist item public read" on public.playlist_items;
create policy "playlist item public read" on public.playlist_items for select to anon using (
  exists (select 1 from public.playlists p where p.id = playlist_id and p.is_public = true)
);
drop policy if exists "playlist item owner insert" on public.playlist_items;
create policy "playlist item owner insert" on public.playlist_items for insert to authenticated with check (
  exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid())
);
drop policy if exists "playlist item owner update" on public.playlist_items;
create policy "playlist item owner update" on public.playlist_items for update to authenticated using (
  exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid())
);
drop policy if exists "playlist item owner delete" on public.playlist_items;
create policy "playlist item owner delete" on public.playlist_items for delete to authenticated using (
  exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid())
);

create index if not exists support_tickets_user_status_idx on public.support_tickets(user_id,status);
create index if not exists copyright_cases_status_idx on public.copyright_cases(status);
create index if not exists risk_flags_status_idx on public.risk_flags(status,severity);
create index if not exists blocks_blocker_idx on public.blocks(blocker_id);
