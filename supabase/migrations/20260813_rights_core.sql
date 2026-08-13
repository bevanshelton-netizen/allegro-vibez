-- ALLEGRO-VIBEZ release contributor and rights ledger

create table if not exists public.release_contributors (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  contributor_name text not null,
  role text not null,
  share_percent numeric(5,2) not null default 0 check (share_percent >= 0 and share_percent <= 100),
  society_member_number text,
  created_at timestamptz not null default now()
);

alter table public.release_contributors enable row level security;

create policy "owners read release contributors" on public.release_contributors
  for select using (auth.uid() = owner_id);
create policy "owners insert release contributors" on public.release_contributors
  for insert with check (auth.uid() = owner_id);
create policy "owners update release contributors" on public.release_contributors
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owners delete release contributors" on public.release_contributors
  for delete using (auth.uid() = owner_id);

create index if not exists release_contributors_release_id_idx
  on public.release_contributors(release_id);
