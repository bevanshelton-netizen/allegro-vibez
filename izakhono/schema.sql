-- ALLEGRO VIBEZ schema for IZAKHONO Core v0.3.1+
-- The project schema is selected by the IZAKHONO provisioning service.

alter table profiles
  add column if not exists stage_name text,
  add column if not exists account_type text not null default 'artist',
  add column if not exists country text,
  add column if not exists city text,
  add column if not exists bio text,
  add column if not exists avatar_path text,
  add column if not exists role text not null default 'creator',
  add column if not exists press_headline text,
  add column if not exists marketing_message text,
  add column if not exists booking_email text,
  add column if not exists booking_phone text,
  add column if not exists website_url text,
  add column if not exists instagram_url text,
  add column if not exists tiktok_url text,
  add column if not exists youtube_url text,
  add column if not exists home_region text,
  add column if not exists primary_genres text[] not null default '{}'::text[],
  add column if not exists languages text[] not null default '{}'::text[],
  add column if not exists available_for_international_bookings boolean not null default false,
  add column if not exists booking_regions text[] not null default '{}'::text[],
  add column if not exists career_path text,
  add column if not exists career_goal text,
  add column if not exists has_video_catalogue boolean not null default false,
  add column if not exists touring_artist boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

create or replace view public_profiles as
select
  id, display_name, stage_name, account_type, country, city, bio, avatar_path,
  press_headline, marketing_message, booking_email, booking_phone,
  website_url, instagram_url, tiktok_url, youtube_url,
  home_region, primary_genres, languages, available_for_international_bookings,
  booking_regions, career_path, career_goal, has_video_catalogue, touring_artist,
  created_at
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
select id, owner_id, title, release_type, status, artwork_path, published_at, created_at
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


-- ALLEGRO Artist Booking Engine — owner-controlled IZAKHONO Core contract.
-- Public promoters receive write-only intake access. Private booking records remain artist-owned.

create table if not exists artist_booking_settings (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null unique references profiles(id) on delete cascade,
  booking_enabled boolean not null default true,
  base_currency text not null default 'ZAR' check (char_length(base_currency)=3),
  minimum_fee numeric(14,2) check (minimum_fee is null or minimum_fee >= 0),
  deposit_percent numeric(5,2) not null default 50 check (deposit_percent between 0 and 100),
  default_set_minutes integer not null default 60 check (default_set_minutes between 10 and 360),
  performance_types text[] not null default array['Live performance','Festival','Corporate event','Private event','Club / venue','Livestream']::text[],
  travel_policy text,
  rider_summary text,
  quote_valid_days integer not null default 7 check (quote_valid_days between 1 and 30),
  updated_at timestamptz not null default now()
);

create or replace view public_artist_booking_settings as
select artist_id, booking_enabled, base_currency, minimum_fee, deposit_percent,
       default_set_minutes, performance_types, travel_policy, rider_summary, quote_valid_days
from artist_booking_settings
where booking_enabled = true;

create table if not exists artist_booking_requests (
  id uuid primary key default gen_random_uuid(),
  request_code text not null unique,
  artist_id uuid not null references profiles(id) on delete cascade,
  company_name text not null check (char_length(trim(company_name)) between 2 and 180),
  contact_name text not null check (char_length(trim(contact_name)) between 2 and 180),
  contact_email text not null check (position('@' in contact_email) > 1),
  contact_phone text not null check (char_length(trim(contact_phone)) between 6 and 60),
  preferred_contact text not null default 'email' check (preferred_contact in ('email','phone','text','whatsapp')),
  performance_type text not null,
  performance_other text,
  event_date date not null,
  event_time text,
  event_visibility text not null default 'public' check (event_visibility in ('public','private')),
  venue_name text,
  venue_address text not null check (char_length(trim(venue_address)) >= 4),
  city text,
  country text not null default 'South Africa',
  event_description text not null check (char_length(trim(event_description)) >= 10),
  expected_audience integer check (expected_audience is null or expected_audience >= 0),
  proposed_budget numeric(14,2) check (proposed_budget is null or proposed_budget >= 0),
  budget_currency text not null default 'ZAR' check (char_length(budget_currency)=3),
  backline_provided boolean,
  flights_hotel_provided boolean,
  ground_transport_provided boolean,
  visa_support_required boolean not null default false,
  livestream_rights_requested boolean not null default false,
  recording_rights_requested boolean not null default false,
  merchandise_opportunity boolean not null default false,
  special_requests text,
  status text not null default 'new' check (status in ('new','qualified','quoted','negotiating','deposit_due','confirmed','completed','declined','cancelled')),
  quoted_gross_amount numeric(14,2) check (quoted_gross_amount is null or quoted_gross_amount >= 0),
  quote_currency text check (quote_currency is null or char_length(quote_currency)=3),
  platform_fee_bps integer not null default 1000 check (platform_fee_bps = 1000),
  platform_fee_amount numeric(14,2) generated always as (
    case when quoted_gross_amount is null then null else round(quoted_gross_amount * 0.10, 2) end
  ) stored,
  creator_net_amount numeric(14,2) generated always as (
    case when quoted_gross_amount is null then null else round(quoted_gross_amount * 0.90, 2) end
  ) stored,
  quote_valid_until date,
  deposit_percent numeric(5,2) check (deposit_percent is null or deposit_percent between 0 and 100),
  deposit_amount numeric(14,2) generated always as (
    case
      when quoted_gross_amount is null or deposit_percent is null then null
      else round(quoted_gross_amount * deposit_percent / 100, 2)
    end
  ) stored,
  deposit_status text not null default 'not_collected' check (deposit_status in ('not_collected','pending','paid','waived','refunded')),
  privacy_consent boolean not null default true,
  source text not null default 'izakhono_core',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists artist_booking_requests_artist_created_idx
  on artist_booking_requests(artist_id, created_at desc);
create index if not exists artist_booking_requests_artist_status_idx
  on artist_booking_requests(artist_id, status, event_date);

create table if not exists artist_booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references artist_booking_requests(id) on delete cascade,
  artist_id uuid not null references profiles(id) on delete cascade,
  event_type text not null,
  actor_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists artist_booking_events_booking_idx
  on artist_booking_events(booking_id, created_at desc);

-- Deliberately contains only fields that an unauthenticated promoter is allowed to submit.
-- There are no status, fee, deposit-payment or settlement columns on this surface.
create table if not exists artist_booking_intake (
  id uuid primary key default gen_random_uuid(),
  request_code text not null unique default ('AB-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  artist_id uuid not null references profiles(id) on delete cascade,
  company_name text not null check (char_length(trim(company_name)) between 2 and 180),
  contact_name text not null check (char_length(trim(contact_name)) between 2 and 180),
  contact_email text not null check (position('@' in contact_email) > 1),
  contact_phone text not null check (char_length(trim(contact_phone)) between 6 and 60),
  preferred_contact text not null default 'email' check (preferred_contact in ('email','phone','text','whatsapp')),
  performance_type text not null,
  performance_other text,
  event_date date not null,
  event_time text,
  event_visibility text not null default 'public' check (event_visibility in ('public','private')),
  venue_name text,
  venue_address text not null check (char_length(trim(venue_address)) >= 4),
  city text,
  country text not null default 'South Africa',
  event_description text not null check (char_length(trim(event_description)) >= 10),
  expected_audience integer check (expected_audience is null or expected_audience >= 0),
  proposed_budget numeric(14,2) check (proposed_budget is null or proposed_budget >= 0),
  budget_currency text not null default 'ZAR' check (char_length(budget_currency)=3),
  backline_provided boolean,
  flights_hotel_provided boolean,
  ground_transport_provided boolean,
  visa_support_required boolean not null default false,
  livestream_rights_requested boolean not null default false,
  recording_rights_requested boolean not null default false,
  merchandise_opportunity boolean not null default false,
  special_requests text,
  privacy_consent boolean not null check (privacy_consent = true),
  created_at timestamptz not null default now()
);

create or replace function allegro_route_booking_intake()
returns trigger language plpgsql as $$
declare
  v_booking_id uuid;
begin
  if not exists (
    select 1
    from artist_booking_settings s
    where s.artist_id = new.artist_id and s.booking_enabled = true
  ) then
    -- Artists without an explicit settings row use the default open posture.
    if exists (
      select 1
      from artist_booking_settings s
      where s.artist_id = new.artist_id and s.booking_enabled = false
    ) then
      raise exception 'This artist is not accepting booking requests';
    end if;
  end if;

  insert into artist_booking_requests (
    request_code, artist_id, company_name, contact_name, contact_email, contact_phone,
    preferred_contact, performance_type, performance_other, event_date, event_time,
    event_visibility, venue_name, venue_address, city, country, event_description,
    expected_audience, proposed_budget, budget_currency, backline_provided,
    flights_hotel_provided, ground_transport_provided, visa_support_required,
    livestream_rights_requested, recording_rights_requested, merchandise_opportunity,
    special_requests, privacy_consent, source
  ) values (
    new.request_code, new.artist_id, trim(new.company_name), trim(new.contact_name),
    lower(trim(new.contact_email)), trim(new.contact_phone), new.preferred_contact,
    new.performance_type, new.performance_other, new.event_date, new.event_time,
    new.event_visibility, new.venue_name, new.venue_address, new.city, new.country,
    new.event_description, new.expected_audience, new.proposed_budget, upper(new.budget_currency),
    new.backline_provided, new.flights_hotel_provided, new.ground_transport_provided,
    new.visa_support_required, new.livestream_rights_requested, new.recording_rights_requested,
    new.merchandise_opportunity, new.special_requests, true, 'izakhono_core_public_intake'
  )
  returning id into v_booking_id;

  insert into artist_booking_events(booking_id, artist_id, event_type, note)
  values(v_booking_id, new.artist_id, 'request_created', 'Public booking request received through IZAKHONO Core intake.');

  return new;
end;
$$;

drop trigger if exists allegro_route_booking_intake_trigger on artist_booking_intake;
create trigger allegro_route_booking_intake_trigger
after insert on artist_booking_intake
for each row execute function allegro_route_booking_intake();
