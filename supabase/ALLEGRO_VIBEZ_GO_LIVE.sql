-- ALLEGRO-VIBEZ GO-LIVE DATABASE SCRIPT
-- Run ONCE in a fresh Supabase SQL Editor for the ALLEGRO-VIBEZ production project.
-- Order: creator core -> rights core -> workflow/prosperity -> commercial core -> launch hardening.

-- =========================================================
-- 1) CREATOR CORE
-- =========================================================
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

create policy "profiles readable by everyone" on public.profiles for select using (true);
create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "users update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "published releases readable by everyone" on public.releases for select using (status = 'published' or auth.uid() = owner_id);
create policy "users insert own releases" on public.releases for insert with check (auth.uid() = owner_id);
create policy "users update own releases" on public.releases for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "users delete own draft releases" on public.releases for delete using (auth.uid() = owner_id and status = 'draft');

insert into storage.buckets (id, name, public)
values ('release-assets', 'release-assets', false)
on conflict (id) do nothing;

create policy "users upload release assets" on storage.objects for insert to authenticated
  with check (bucket_id = 'release-assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users read own release assets" on storage.objects for select to authenticated
  using (bucket_id = 'release-assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users update own release assets" on storage.objects for update to authenticated
  using (bucket_id = 'release-assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users delete own release assets" on storage.objects for delete to authenticated
  using (bucket_id = 'release-assets' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
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
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- =========================================================
-- 2) RIGHTS CORE
-- =========================================================
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
create policy "owners read release contributors" on public.release_contributors for select using (auth.uid() = owner_id);
create policy "owners insert release contributors" on public.release_contributors for insert with check (auth.uid() = owner_id);
create policy "owners update release contributors" on public.release_contributors for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owners delete release contributors" on public.release_contributors for delete using (auth.uid() = owner_id);
create index if not exists release_contributors_release_id_idx on public.release_contributors(release_id);

-- =========================================================
-- 3) WORKFLOW + PROSPERITY
-- =========================================================
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
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create policy "owners read release events" on public.release_events for select using (
  exists (select 1 from public.releases r where r.id = release_id and r.owner_id = auth.uid()) or public.is_admin()
);
create policy "admins manage release events" on public.release_events for all using (public.is_admin()) with check (public.is_admin());
create policy "owners read royalty ledger" on public.royalty_ledger for select using (owner_id = auth.uid() or public.is_admin());
create policy "admins manage royalty ledger" on public.royalty_ledger for all using (public.is_admin()) with check (public.is_admin());
create policy "admins read all releases" on public.releases for select using (public.is_admin());
create policy "admins update all releases" on public.releases for update using (public.is_admin()) with check (public.is_admin());

create or replace function public.submit_release(p_release_id uuid)
returns public.releases language plpgsql security definer set search_path = public as $$
declare v_release public.releases;
begin
  update public.releases
  set status = 'submitted', submitted_at = now(), updated_at = now(), review_note = null
  where id = p_release_id and owner_id = auth.uid() and status in ('draft','rejected')
  returning * into v_release;
  if v_release.id is null then raise exception 'Release cannot be submitted'; end if;
  insert into public.release_events (release_id, actor_id, event_type)
  values (v_release.id, auth.uid(), 'submitted');
  return v_release;
end;
$$;

create or replace function public.review_release(p_release_id uuid, p_decision text, p_note text default null)
returns public.releases language plpgsql security definer set search_path = public as $$
declare v_release public.releases; v_status text; v_event text;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if p_decision not in ('approved','rejected','published') then raise exception 'Invalid review decision'; end if;
  v_status := p_decision; v_event := p_decision;
  update public.releases
  set status = v_status,
      reviewed_at = case when p_decision in ('approved','rejected') then now() else reviewed_at end,
      published_at = case when p_decision = 'published' then now() else published_at end,
      review_note = p_note,
      updated_at = now()
  where id = p_release_id and status in ('submitted','approved')
  returning * into v_release;
  if v_release.id is null then raise exception 'Release cannot be reviewed in its current state'; end if;
  insert into public.release_events (release_id, actor_id, event_type, note)
  values (v_release.id, auth.uid(), v_event, p_note);
  return v_release;
end;
$$;

create or replace view public.creator_royalty_summary as
select owner_id, currency,
  coalesce(sum(gross_amount),0)::numeric(14,2) as gross_amount,
  coalesce(sum(platform_fee),0)::numeric(14,2) as platform_fee,
  coalesce(sum(net_amount),0)::numeric(14,2) as net_amount
from public.royalty_ledger group by owner_id, currency;

grant select on public.creator_royalty_summary to authenticated;
grant execute on function public.submit_release(uuid) to authenticated;
grant execute on function public.review_release(uuid,text,text) to authenticated;

-- =========================================================
-- 4) COMMERCIAL CORE
-- =========================================================
create table if not exists public.subscription_plans (
  code text primary key,
  name text not null,
  monthly_price numeric(12,2) not null default 0,
  currency text not null default 'USD' check (char_length(currency)=3),
  platform_fee_percent numeric(5,2) not null default 10 check (platform_fee_percent between 0 and 100),
  active boolean not null default true,
  features jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.subscription_plans (code,name,monthly_price,currency,platform_fee_percent,features)
values
  ('free','Free',0,'USD',10,'["Up to 5 active releases","Creator profile","Basic rights ledger"]'),
  ('pro','Pro',9,'USD',8,'["Unlimited releases","Advanced royalty dashboard","Priority review","Expanded creator tools"]'),
  ('label','Label',49,'USD',6,'["Multi-artist operations","Label reporting","Team workflows","Priority support"]')
on conflict (code) do update set
  name=excluded.name, monthly_price=excluded.monthly_price, currency=excluded.currency,
  platform_fee_percent=excluded.platform_fee_percent, features=excluded.features, active=true;

create table if not exists public.creator_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null references public.subscription_plans(code),
  status text not null default 'active' check (status in ('active','past_due','cancelled','trialing')),
  provider text,
  provider_customer_ref text,
  provider_subscription_ref text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id)
);

create table if not exists public.creator_wallets (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  currency text not null default 'ZAR' check (char_length(currency)=3),
  available_balance numeric(14,2) not null default 0,
  pending_balance numeric(14,2) not null default 0,
  lifetime_paid numeric(14,2) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  currency text not null default 'ZAR' check (char_length(currency)=3),
  amount numeric(14,2) not null check (amount > 0),
  status text not null default 'requested' check (status in ('requested','approved','processing','paid','rejected')),
  destination_label text,
  external_reference text,
  admin_note text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.subscription_plans enable row level security;
alter table public.creator_subscriptions enable row level security;
alter table public.creator_wallets enable row level security;
alter table public.payout_requests enable row level security;

create policy "plans readable" on public.subscription_plans for select using (active = true or public.is_admin());
create policy "creator reads own subscription" on public.creator_subscriptions for select using (owner_id = auth.uid() or public.is_admin());
create policy "admins manage subscriptions" on public.creator_subscriptions for all using (public.is_admin()) with check (public.is_admin());
create policy "creator reads own wallet" on public.creator_wallets for select using (owner_id = auth.uid() or public.is_admin());
create policy "admins manage wallets" on public.creator_wallets for all using (public.is_admin()) with check (public.is_admin());
create policy "creator reads own payouts" on public.payout_requests for select using (owner_id = auth.uid() or public.is_admin());
create policy "creator requests payout" on public.payout_requests for insert with check (owner_id = auth.uid());
create policy "admins manage payouts" on public.payout_requests for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.ensure_creator_commercial_accounts()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.creator_subscriptions(owner_id,plan_code,status)
  values(new.id,'free','active') on conflict(owner_id) do nothing;
  insert into public.creator_wallets(owner_id,currency)
  values(new.id,'ZAR') on conflict(owner_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_commercial_created on auth.users;
create trigger on_auth_user_commercial_created after insert on auth.users
for each row execute procedure public.ensure_creator_commercial_accounts();

insert into public.creator_subscriptions(owner_id,plan_code,status)
select id,'free','active' from auth.users on conflict(owner_id) do nothing;
insert into public.creator_wallets(owner_id,currency)
select id,'ZAR' from auth.users on conflict(owner_id) do nothing;

-- =========================================================
-- 5) LAUNCH HARDENING
-- =========================================================
create or replace function public.request_payout(p_amount numeric, p_destination_label text default null)
returns public.payout_requests language plpgsql security definer set search_path = public as $$
declare v_wallet public.creator_wallets; v_reserved numeric(14,2); v_request public.payout_requests;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Payout amount must be greater than zero'; end if;
  select * into v_wallet from public.creator_wallets where owner_id = auth.uid() for update;
  if v_wallet.owner_id is null then raise exception 'Creator wallet not found'; end if;
  select coalesce(sum(amount),0)::numeric(14,2) into v_reserved
  from public.payout_requests where owner_id = auth.uid() and status in ('requested','approved','processing');
  if p_amount > (v_wallet.available_balance - v_reserved) then raise exception 'Requested amount exceeds currently withdrawable balance'; end if;
  insert into public.payout_requests(owner_id,currency,amount,destination_label)
  values(auth.uid(),v_wallet.currency,p_amount,nullif(trim(p_destination_label),'')) returning * into v_request;
  return v_request;
end;
$$;

grant execute on function public.request_payout(numeric,text) to authenticated;

create or replace function public.admin_update_payout(
  p_request_id uuid, p_status text, p_admin_note text default null, p_external_reference text default null
)
returns public.payout_requests language plpgsql security definer set search_path = public as $$
declare v_request public.payout_requests; v_wallet public.creator_wallets; v_previous_status text;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('approved','processing','paid','rejected') then raise exception 'Invalid payout status'; end if;
  select * into v_request from public.payout_requests where id = p_request_id for update;
  if v_request.id is null then raise exception 'Payout request not found'; end if;
  v_previous_status := v_request.status;
  if v_previous_status in ('paid','rejected') then raise exception 'Finalised payout cannot be changed'; end if;
  if p_status = 'paid' then
    select * into v_wallet from public.creator_wallets where owner_id = v_request.owner_id for update;
    if v_wallet.owner_id is null then raise exception 'Creator wallet not found'; end if;
    if v_wallet.available_balance < v_request.amount then raise exception 'Wallet balance is insufficient to mark this payout paid'; end if;
    update public.creator_wallets
    set available_balance = available_balance - v_request.amount,
        lifetime_paid = lifetime_paid + v_request.amount,
        updated_at = now()
    where owner_id = v_request.owner_id;
  end if;
  update public.payout_requests
  set status = p_status,
      admin_note = coalesce(nullif(trim(p_admin_note),''),admin_note),
      external_reference = coalesce(nullif(trim(p_external_reference),''),external_reference),
      processed_at = case when p_status in ('paid','rejected') then now() else processed_at end
  where id = p_request_id returning * into v_request;
  return v_request;
end;
$$;

grant execute on function public.admin_update_payout(uuid,text,text,text) to authenticated;
drop policy if exists "creator requests payout" on public.payout_requests;
alter table public.release_contributors drop constraint if exists release_contributors_share_percent_check;
alter table public.release_contributors add constraint release_contributors_share_percent_check check (share_percent >= 0 and share_percent <= 100);

-- End of ALLEGRO-VIBEZ go-live database script.
