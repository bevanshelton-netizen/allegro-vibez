-- ALLEGRO-VIBEZ release workflow, moderation and prosperity ledger
-- Apply after 20260813_creator_core.sql and 20260813_rights_core.sql.

alter table public.profiles
  add column if not exists bio text,
  add column if not exists avatar_path text,
  add column if not exists role text not null default 'creator' check (role in ('creator','admin'));

alter table public.releases
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists review_note text;

create table if not exists public.release_events (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('submitted','approved','rejected','published','returned_to_draft')),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.royalty_ledger (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  release_id uuid references public.releases(id) on delete set null,
  source text not null,
  territory text,
  currency text not null default 'ZAR' check (char_length(currency) = 3),
  gross_amount numeric(14,2) not null default 0,
  platform_fee numeric(14,2) not null default 0,
  net_amount numeric(14,2) generated always as (gross_amount - platform_fee) stored,
  statement_period date,
  external_reference text,
  created_at timestamptz not null default now()
);

alter table public.release_events enable row level security;
alter table public.royalty_ledger enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create policy "owners read release events" on public.release_events
  for select using (
    exists (select 1 from public.releases r where r.id = release_id and r.owner_id = auth.uid())
    or public.is_admin()
  );

create policy "admins manage release events" on public.release_events
  for all using (public.is_admin()) with check (public.is_admin());

create policy "owners read royalty ledger" on public.royalty_ledger
  for select using (owner_id = auth.uid() or public.is_admin());

create policy "admins manage royalty ledger" on public.royalty_ledger
  for all using (public.is_admin()) with check (public.is_admin());

create policy "admins read all releases" on public.releases
  for select using (public.is_admin());

create policy "admins update all releases" on public.releases
  for update using (public.is_admin()) with check (public.is_admin());

create or replace function public.submit_release(p_release_id uuid)
returns public.releases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_release public.releases;
begin
  update public.releases
  set status = 'submitted', submitted_at = now(), updated_at = now(), review_note = null
  where id = p_release_id
    and owner_id = auth.uid()
    and status in ('draft','rejected')
  returning * into v_release;

  if v_release.id is null then
    raise exception 'Release cannot be submitted';
  end if;

  insert into public.release_events (release_id, actor_id, event_type)
  values (v_release.id, auth.uid(), 'submitted');

  return v_release;
end;
$$;

create or replace function public.review_release(p_release_id uuid, p_decision text, p_note text default null)
returns public.releases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_release public.releases;
  v_status text;
  v_event text;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_decision not in ('approved','rejected','published') then
    raise exception 'Invalid review decision';
  end if;

  v_status := p_decision;
  v_event := p_decision;

  update public.releases
  set status = v_status,
      reviewed_at = case when p_decision in ('approved','rejected') then now() else reviewed_at end,
      published_at = case when p_decision = 'published' then now() else published_at end,
      review_note = p_note,
      updated_at = now()
  where id = p_release_id
    and status in ('submitted','approved')
  returning * into v_release;

  if v_release.id is null then
    raise exception 'Release cannot be reviewed in its current state';
  end if;

  insert into public.release_events (release_id, actor_id, event_type, note)
  values (v_release.id, auth.uid(), v_event, p_note);

  return v_release;
end;
$$;

create or replace view public.creator_royalty_summary as
select
  owner_id,
  currency,
  coalesce(sum(gross_amount),0)::numeric(14,2) as gross_amount,
  coalesce(sum(platform_fee),0)::numeric(14,2) as platform_fee,
  coalesce(sum(net_amount),0)::numeric(14,2) as net_amount
from public.royalty_ledger
group by owner_id, currency;

grant select on public.creator_royalty_summary to authenticated;
grant execute on function public.submit_release(uuid) to authenticated;
grant execute on function public.review_release(uuid,text,text) to authenticated;
