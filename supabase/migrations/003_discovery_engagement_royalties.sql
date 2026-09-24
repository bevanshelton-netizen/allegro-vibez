-- ALLEGRO-VIBEZ V1 discovery, engagement, notifications and royalty foundations.
-- Safe additive migration for the rebuild. Review against an existing production schema before running.

alter table public.releases add column if not exists slug text;
create unique index if not exists releases_slug_unique on public.releases(slug) where slug is not null;

create table if not exists public.listening_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  seconds_played integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.royalty_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  track_id uuid references public.tracks(id) on delete restrict,
  source text not null,
  period_start date not null,
  period_end date not null,
  gross_amount numeric(14,2) not null default 0,
  fees_amount numeric(14,2) not null default 0,
  net_amount numeric(14,2) generated always as (gross_amount - fees_amount) stored,
  currency text not null default 'ZAR',
  status text not null default 'pending' check (status in ('pending','available','paid','reversed')),
  source_reference text,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  product_updates boolean not null default true,
  release_updates boolean not null default true,
  financial_updates boolean not null default true,
  marketing_email boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.listening_history enable row level security;
alter table public.royalty_entries enable row level security;
alter table public.notification_preferences enable row level security;

drop policy if exists "history owner read" on public.listening_history;
create policy "history owner read" on public.listening_history for select using (user_id = auth.uid());
drop policy if exists "history owner insert" on public.listening_history;
create policy "history owner insert" on public.listening_history for insert with check (user_id = auth.uid());

drop policy if exists "royalty owner read" on public.royalty_entries;
create policy "royalty owner read" on public.royalty_entries for select using (user_id = auth.uid() or public.current_role() in ('admin','super_admin','finance_admin'));

drop policy if exists "notification prefs owner all" on public.notification_preferences;
create policy "notification prefs owner all" on public.notification_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.record_stream_event(
  p_track_id uuid,
  p_user_id uuid default null,
  p_seconds_played integer default 0,
  p_session_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_id uuid := gen_random_uuid();
  v_qualified boolean := p_seconds_played >= 30;
  v_suspicious boolean := false;
begin
  if not exists (
    select 1 from public.tracks t
    join public.release_tracks rt on rt.track_id=t.id
    join public.releases r on r.id=rt.release_id
    where t.id=p_track_id and r.status='published'
  ) then
    raise exception 'Track is not publicly playable';
  end if;

  if p_session_id is not null and exists (
    select 1 from public.stream_events
    where session_id=p_session_id and track_id=p_track_id and created_at > now()-interval '2 hours'
  ) then
    v_suspicious := true;
    v_qualified := false;
  end if;

  insert into public.stream_events(id,user_id,track_id,session_id,seconds_played,qualified,suspicious)
  values(v_id, case when p_user_id=auth.uid() then p_user_id else null end, p_track_id,p_session_id,greatest(p_seconds_played,0),v_qualified,v_suspicious);

  if auth.uid() is not null then
    insert into public.listening_history(user_id,track_id,seconds_played)
    values(auth.uid(),p_track_id,greatest(p_seconds_played,0));
  end if;
  return v_id;
end;
$$;

grant execute on function public.record_stream_event(uuid,uuid,integer,uuid) to anon, authenticated;

drop policy if exists "notification owner read" on public.notifications;
create policy "notification owner read" on public.notifications for select using (user_id = auth.uid() or public.current_role() in ('admin','super_admin'));
drop policy if exists "notification owner update" on public.notifications;
create policy "notification owner update" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
