-- ALLEGRO-VIBEZ creator core schema
-- Apply with the Supabase CLI or SQL editor before enabling live catalogue features.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  stage_name text,
  account_type text not null default 'artist',
  country text,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.releases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  release_type text not null check (release_type in ('Single','EP','Album','DJ Mix')),
  status text not null default 'draft' check (status in ('draft','submitted','approved','published','rejected')),
  audio_path text,
  artwork_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.releases enable row level security;

create policy "profiles readable by everyone" on public.profiles
  for select using (true);
create policy "users insert own profile" on public.profiles
  for insert with check (auth.uid() = id);
create policy "users update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "published releases readable by everyone" on public.releases
  for select using (status = 'published' or auth.uid() = owner_id);
create policy "users insert own releases" on public.releases
  for insert with check (auth.uid() = owner_id);
create policy "users update own releases" on public.releases
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "users delete own draft releases" on public.releases
  for delete using (auth.uid() = owner_id and status = 'draft');

insert into storage.buckets (id, name, public)
values ('release-assets', 'release-assets', false)
on conflict (id) do nothing;

create policy "users upload release assets" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'release-assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users read own release assets" on storage.objects
  for select to authenticated
  using (bucket_id = 'release-assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users update own release assets" on storage.objects
  for update to authenticated
  using (bucket_id = 'release-assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users delete own release assets" on storage.objects
  for delete to authenticated
  using (bucket_id = 'release-assets' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, stage_name, account_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'stage_name',
    coalesce(new.raw_user_meta_data->>'account_type', 'artist')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
