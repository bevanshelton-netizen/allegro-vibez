-- ALLEGRO VIBEZ schema for IZAKHONO Core v0.3+
-- The project schema is selected by the IZAKHONO provisioning service.

alter table profiles
  add column if not exists stage_name text,
  add column if not exists account_type text not null default 'artist',
  add column if not exists country text,
  add column if not exists city text,
  add column if not exists bio text,
  add column if not exists avatar_path text,
  add column if not exists role text not null default 'creator',
  add column if not exists updated_at timestamptz not null default now();

create or replace view public_profiles as
select id, display_name, stage_name, account_type, country, city, bio, avatar_path, created_at
from profiles;

create table if not exists releases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  title text not null check (char_length(title) between 1 and 180),
  release_type text not null check (release_type in ('Single','EP','Album','DJ Mix')),
  status text not null default 'draft' check (status in ('draft','submitted','approved','published','rejected')),
  audio_path text,
  artwork_path text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  published_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists releases_owner_created_idx on releases(owner_id, created_at desc);
create index if not exists releases_status_created_idx on releases(status, created_at desc);

create or replace view published_releases as
select id, owner_id, title, release_type, artwork_path, published_at, created_at
from releases
where status = 'published';

create table if not exists release_contributors (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references releases(id) on delete cascade,
  owner_id uuid not null,
  contributor_name text not null,
  role text not null,
  share_percent numeric(5,2) not null default 0 check (share_percent >= 0 and share_percent <= 100),
  society_member_number text,
  created_at timestamptz not null default now()
);

create index if not exists release_contributors_release_idx on release_contributors(release_id);

create table if not exists release_events (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references releases(id) on delete cascade,
  owner_id uuid not null,
  actor_id uuid,
  event_type text not null check (event_type in ('submitted','approved','rejected','published','returned_to_draft')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists release_events_release_idx on release_events(release_id, created_at desc);

create table if not exists royalty_ledger (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  release_id uuid references releases(id) on delete set null,
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

create index if not exists royalty_ledger_owner_idx on royalty_ledger(owner_id, created_at desc);

create or replace view creator_royalty_summary as
select owner_id, currency,
  coalesce(sum(gross_amount),0)::numeric(14,2) as gross_amount,
  coalesce(sum(platform_fee),0)::numeric(14,2) as platform_fee,
  coalesce(sum(net_amount),0)::numeric(14,2) as net_amount
from royalty_ledger
group by owner_id, currency;

create table if not exists subscription_plans (
  code text primary key,
  name text not null,
  monthly_price numeric(12,2) not null default 0,
  currency text not null default 'USD' check (char_length(currency)=3),
  platform_fee_percent numeric(5,2) not null default 10 check (platform_fee_percent between 0 and 100),
  active boolean not null default true,
  features jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists creator_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique,
  plan_code text not null references subscription_plans(code),
  status text not null default 'active' check (status in ('active','past_due','cancelled','trialing')),
  provider text,
  provider_customer_ref text,
  provider_subscription_ref text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists creator_wallets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique,
  currency text not null default 'ZAR' check (char_length(currency)=3),
  available_balance numeric(14,2) not null default 0,
  pending_balance numeric(14,2) not null default 0,
  lifetime_paid numeric(14,2) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists payout_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  currency text not null default 'ZAR' check (char_length(currency)=3),
  amount numeric(14,2) not null check (amount > 0),
  status text not null default 'requested' check (status in ('requested','approved','processing','paid','rejected')),
  destination_label text,
  external_reference text,
  admin_note text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists payout_requests_owner_idx on payout_requests(owner_id, requested_at desc);

create or replace function allegro_profile_defaults()
returns trigger language plpgsql as $$
begin
  insert into creator_subscriptions(owner_id, plan_code, status)
  values(new.id, 'free', 'active')
  on conflict(owner_id) do nothing;

  insert into creator_wallets(owner_id, currency)
  values(new.id, 'ZAR')
  on conflict(owner_id) do nothing;

  return new;
end;
$$;

drop trigger if exists allegro_profile_defaults_trigger on profiles;
create trigger allegro_profile_defaults_trigger
after insert on profiles
for each row execute function allegro_profile_defaults();

create or replace function allegro_validate_payout()
returns trigger language plpgsql as $$
declare
  v_available numeric(14,2);
  v_reserved numeric(14,2);
begin
  select available_balance into v_available
  from creator_wallets
  where owner_id = new.owner_id;

  if v_available is null then
    raise exception 'Creator wallet not found';
  end if;

  select coalesce(sum(amount),0)::numeric(14,2) into v_reserved
  from payout_requests
  where owner_id = new.owner_id
    and status in ('requested','approved','processing');

  if new.amount > (v_available - v_reserved) then
    raise exception 'Requested amount exceeds currently withdrawable balance';
  end if;

  return new;
end;
$$;

drop trigger if exists allegro_validate_payout_trigger on payout_requests;
create trigger allegro_validate_payout_trigger
before insert on payout_requests
for each row execute function allegro_validate_payout();
