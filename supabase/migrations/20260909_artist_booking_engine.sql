-- ALLEGRO Artist Booking Engine
-- Public booking requests are written only through a validated RPC.
-- Payment collection is deliberately not represented as live here.

create table if not exists public.artist_booking_settings (
  artist_id uuid primary key references public.profiles(id) on delete cascade,
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

create table if not exists public.artist_booking_requests (
  id uuid primary key default gen_random_uuid(),
  request_code text not null unique,
  artist_id uuid not null references public.profiles(id) on delete cascade,
  company_name text not null,
  contact_name text not null,
  contact_email text not null,
  contact_phone text not null,
  preferred_contact text not null default 'email' check (preferred_contact in ('email','phone','text','whatsapp')),
  performance_type text not null,
  performance_other text,
  event_date date not null,
  event_time text,
  event_visibility text not null default 'public' check (event_visibility in ('public','private')),
  venue_name text,
  venue_address text not null,
  city text,
  country text not null default 'South Africa',
  event_description text not null,
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
  platform_fee_bps integer check (platform_fee_bps is null or platform_fee_bps between 0 and 10000),
  platform_fee_amount numeric(14,2),
  creator_net_amount numeric(14,2),
  quote_valid_until date,
  deposit_percent numeric(5,2) check (deposit_percent is null or deposit_percent between 0 and 100),
  deposit_amount numeric(14,2),
  deposit_status text not null default 'not_collected' check (deposit_status in ('not_collected','pending','paid','waived','refunded')),
  privacy_consent boolean not null default false,
  source text not null default 'artist_space',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artist_booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.artist_booking_requests(id) on delete cascade,
  event_type text not null,
  actor_id uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.artist_booking_settings enable row level security;
alter table public.artist_booking_requests enable row level security;
alter table public.artist_booking_events enable row level security;

drop policy if exists "public reads enabled artist booking settings" on public.artist_booking_settings;
create policy "public reads enabled artist booking settings"
on public.artist_booking_settings for select
using (booking_enabled = true or artist_id = auth.uid() or public.is_admin());

drop policy if exists "artists manage own booking settings" on public.artist_booking_settings;
create policy "artists manage own booking settings"
on public.artist_booking_settings for all
using (artist_id = auth.uid() or public.is_admin())
with check (artist_id = auth.uid() or public.is_admin());

drop policy if exists "artists read own booking requests" on public.artist_booking_requests;
create policy "artists read own booking requests"
on public.artist_booking_requests for select
using (artist_id = auth.uid() or public.is_admin());

drop policy if exists "artists read own booking events" on public.artist_booking_events;
create policy "artists read own booking events"
on public.artist_booking_events for select
using (
  exists (
    select 1 from public.artist_booking_requests b
    where b.id = booking_id
      and (b.artist_id = auth.uid() or public.is_admin())
  )
);

create or replace function public.create_artist_booking_request(p_artist_id uuid, p_payload jsonb)
returns table(id uuid, request_code text)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_id uuid;
  v_code text;
  v_date date;
  v_consent boolean;
  v_enabled boolean;
begin
  if not exists (select 1 from public.profiles where profiles.id = p_artist_id) then
    raise exception 'Artist not found';
  end if;

  select coalesce(s.booking_enabled,true) into v_enabled
  from (select 1) seed
  left join public.artist_booking_settings s on s.artist_id=p_artist_id;
  if not v_enabled then raise exception 'This artist is not accepting booking requests.'; end if;

  v_consent := coalesce((p_payload->>'privacy_consent')::boolean,false);
  if not v_consent then raise exception 'Privacy consent is required.'; end if;

  if char_length(trim(coalesce(p_payload->>'company_name',''))) < 2
     or char_length(trim(coalesce(p_payload->>'contact_name',''))) < 2
     or position('@' in coalesce(p_payload->>'contact_email','')) < 2
     or char_length(trim(coalesce(p_payload->>'contact_phone',''))) < 6
     or char_length(trim(coalesce(p_payload->>'venue_address',''))) < 4
     or char_length(trim(coalesce(p_payload->>'event_description',''))) < 10 then
    raise exception 'Please complete the required booking details.';
  end if;

  begin
    v_date := (p_payload->>'event_date')::date;
  exception when others then
    raise exception 'A valid event date is required.';
  end;
  if v_date < current_date then raise exception 'Event date cannot be in the past.'; end if;

  v_code := 'AB-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));

  insert into public.artist_booking_requests(
    request_code,artist_id,company_name,contact_name,contact_email,contact_phone,preferred_contact,
    performance_type,performance_other,event_date,event_time,event_visibility,venue_name,venue_address,
    city,country,event_description,expected_audience,proposed_budget,budget_currency,backline_provided,
    flights_hotel_provided,ground_transport_provided,visa_support_required,livestream_rights_requested,
    recording_rights_requested,merchandise_opportunity,special_requests,privacy_consent,source
  ) values (
    v_code,p_artist_id,
    left(trim(p_payload->>'company_name'),180),
    left(trim(p_payload->>'contact_name'),180),
    left(lower(trim(p_payload->>'contact_email')),254),
    left(trim(p_payload->>'contact_phone'),60),
    coalesce(nullif(p_payload->>'preferred_contact',''),'email'),
    left(trim(coalesce(p_payload->>'performance_type','Live performance')),120),
    left(trim(coalesce(p_payload->>'performance_other','')),1000),
    v_date,left(trim(coalesce(p_payload->>'event_time','')),40),
    coalesce(nullif(p_payload->>'event_visibility',''),'public'),
    left(trim(coalesce(p_payload->>'venue_name','')),180),
    left(trim(p_payload->>'venue_address'),500),
    left(trim(coalesce(p_payload->>'city','')),120),
    left(trim(coalesce(p_payload->>'country','South Africa')),120),
    left(trim(p_payload->>'event_description'),3000),
    nullif(p_payload->>'expected_audience','')::integer,
    nullif(p_payload->>'proposed_budget','')::numeric,
    upper(coalesce(nullif(p_payload->>'budget_currency',''),'ZAR')),
    nullif(p_payload->>'backline_provided','')::boolean,
    nullif(p_payload->>'flights_hotel_provided','')::boolean,
    nullif(p_payload->>'ground_transport_provided','')::boolean,
    coalesce(nullif(p_payload->>'visa_support_required','')::boolean,false),
    coalesce(nullif(p_payload->>'livestream_rights_requested','')::boolean,false),
    coalesce(nullif(p_payload->>'recording_rights_requested','')::boolean,false),
    coalesce(nullif(p_payload->>'merchandise_opportunity','')::boolean,false),
    left(trim(coalesce(p_payload->>'special_requests','')),3000),
    true,'artist_space'
  ) returning artist_booking_requests.id into v_id;

  insert into public.artist_booking_events(booking_id,event_type,note)
  values(v_id,'request_created','Public booking request received through the ALLEGRO Artist Booking Engine.');

  return query select v_id,v_code;
end;
$$;

create or replace function public.quote_artist_booking(
  p_booking_id uuid,
  p_gross_amount numeric,
  p_currency text default 'ZAR',
  p_deposit_percent numeric default null
)
returns public.artist_booking_requests
language plpgsql
security definer
set search_path=public
as $$
declare
  v_booking public.artist_booking_requests;
  v_fee_bps integer;
  v_deposit numeric;
  v_days integer;
begin
  select * into v_booking from public.artist_booking_requests where id=p_booking_id;
  if v_booking.id is null then raise exception 'Booking request not found'; end if;
  if auth.uid() is null or not (v_booking.artist_id=auth.uid() or public.is_admin()) then
    raise exception 'Not authorised';
  end if;
  if p_gross_amount is null or p_gross_amount <= 0 then raise exception 'Quote amount must be greater than zero'; end if;

  v_fee_bps := public.effective_platform_fee_bps(v_booking.artist_id,now());
  select coalesce(p_deposit_percent,s.deposit_percent,50),coalesce(s.quote_valid_days,7)
    into v_deposit,v_days
  from (select 1) seed
  left join public.artist_booking_settings s on s.artist_id=v_booking.artist_id;

  update public.artist_booking_requests
  set status='quoted',
      quoted_gross_amount=round(p_gross_amount,2),
      quote_currency=upper(p_currency),
      platform_fee_bps=v_fee_bps,
      platform_fee_amount=round(p_gross_amount*v_fee_bps/10000,2),
      creator_net_amount=round(p_gross_amount-(p_gross_amount*v_fee_bps/10000),2),
      quote_valid_until=current_date+v_days,
      deposit_percent=v_deposit,
      deposit_amount=round(p_gross_amount*v_deposit/100,2),
      deposit_status='not_collected',
      updated_at=now()
  where id=p_booking_id
  returning * into v_booking;

  insert into public.artist_booking_events(booking_id,event_type,actor_id,note)
  values(p_booking_id,'quote_created',auth.uid(),'Artist quote created. Payment collection remains separate until an approved gateway is active.');

  return v_booking;
end;
$$;

create or replace function public.set_artist_booking_status(p_booking_id uuid,p_status text,p_note text default null)
returns public.artist_booking_requests
language plpgsql
security definer
set search_path=public
as $$
declare
  v_booking public.artist_booking_requests;
begin
  if p_status not in ('new','qualified','quoted','negotiating','deposit_due','confirmed','completed','declined','cancelled') then
    raise exception 'Invalid booking status';
  end if;
  select * into v_booking from public.artist_booking_requests where id=p_booking_id;
  if v_booking.id is null then raise exception 'Booking request not found'; end if;
  if auth.uid() is null or not (v_booking.artist_id=auth.uid() or public.is_admin()) then
    raise exception 'Not authorised';
  end if;

  update public.artist_booking_requests
  set status=p_status,updated_at=now()
  where id=p_booking_id
  returning * into v_booking;

  insert into public.artist_booking_events(booking_id,event_type,actor_id,note)
  values(p_booking_id,'status_'||p_status,auth.uid(),nullif(left(coalesce(p_note,''),1000),''));

  return v_booking;
end;
$$;

grant execute on function public.create_artist_booking_request(uuid,jsonb) to anon, authenticated;
grant execute on function public.quote_artist_booking(uuid,numeric,text,numeric) to authenticated;
grant execute on function public.set_artist_booking_status(uuid,text,text) to authenticated;

comment on table public.artist_booking_requests is
'ALLEGRO artist performance booking pipeline. Deposit status is evidence only; it must not be marked paid without verified payment evidence.';
