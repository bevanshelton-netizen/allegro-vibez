-- ALLEGRO-VIBEZ canonical marketplace + merch rollout
-- Target project: Allegro-Vibez (zoolsumifdtanycjryje)
-- Prepared 2026-09-25.
-- Apply only to the canonical ALLEGRO production Supabase project after it has been restored/unpaused.
-- This bundle intentionally does not contain service-role keys, payment secrets, or any private credentials.
-- Prerequisite: the existing ALLEGRO creator/workflow migrations that define public.profiles and public.is_admin() must already be present.


-- =========================================================
-- SOURCE: supabase/migrations/20260924_musician_marketplace.sql
-- =========================================================
-- ALLEGRO-VIBEZ internal musician marketplace + vetting + 10% transaction fee
-- Browsing is public. Posting, responding and paid engagements require approved vetting.
-- Sensitive identity evidence must be handled through a secure review process, not public profile fields.

create table if not exists public.musician_vetting (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','in_review','approved','rejected','suspended','expired')),
  verification_level text not null default 'basic' check (verification_level in ('basic','enhanced','organisation')),
  identity_checked boolean not null default false,
  contact_checked boolean not null default false,
  profile_checked boolean not null default false,
  references_checked boolean not null default false,
  organisation_checked boolean not null default false,
  safety_declaration_accepted boolean not null default false,
  reviewed_at timestamptz,
  expires_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.musician_ads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 5 and 140),
  description text not null check (char_length(description) between 20 and 3000),
  poster_role text not null,
  looking_for text[] not null default '{}',
  genres text[] not null default '{}',
  country text,
  city text,
  remote_ok boolean not null default false,
  engagement_type text not null default 'collaboration'
    check (engagement_type in ('collaboration','band_member','session_work','gig','tour','recording','songwriting','production','choir','other')),
  compensation text not null default 'negotiable'
    check (compensation in ('paid','unpaid','negotiable','royalty_split','expenses_only')),
  budget_amount numeric(14,2),
  budget_currency text not null default 'ZAR' check (char_length(budget_currency)=3),
  audition_required boolean not null default false,
  status text not null default 'published'
    check (status in ('draft','pending_review','published','paused','closed','rejected','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '60 days')
);

create table if not exists public.musician_ad_responses (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.musician_ads(id) on delete cascade,
  applicant_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(message) between 20 and 2000),
  portfolio_url text,
  proposed_amount numeric(14,2),
  proposed_currency text not null default 'ZAR' check (char_length(proposed_currency)=3),
  status text not null default 'submitted'
    check (status in ('submitted','shortlisted','declined','accepted','withdrawn','reported')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(ad_id, applicant_id)
);

create table if not exists public.musician_marketplace_orders (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid references public.musician_ads(id) on delete set null,
  response_id uuid references public.musician_ad_responses(id) on delete set null,
  buyer_id uuid not null references auth.users(id) on delete restrict,
  seller_id uuid not null references auth.users(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  description text not null,
  currency text not null default 'ZAR' check (char_length(currency)=3),
  gross_amount numeric(14,2) not null check (gross_amount > 0),
  platform_fee_percent numeric(5,2) not null default 10 check (platform_fee_percent = 10),
  platform_fee_amount numeric(14,2) not null,
  seller_net_amount numeric(14,2) not null,
  status text not null default 'proposed'
    check (status in ('proposed','accepted','payment_pending','paid','in_progress','completed','disputed','cancelled','refunded')),
  payment_provider text,
  payment_reference text,
  paid_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (buyer_id <> seller_id),
  check (platform_fee_amount = round(gross_amount * 0.10, 2)),
  check (seller_net_amount = gross_amount - platform_fee_amount)
);

create table if not exists public.musician_marketplace_ledger (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.musician_marketplace_orders(id) on delete restrict,
  event_type text not null check (event_type in ('payment_received','platform_fee_accrued','seller_balance_pending','seller_balance_available','refund','payout')),
  currency text not null check (char_length(currency)=3),
  amount numeric(14,2) not null,
  provider_reference text,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.musician_safety_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  ad_id uuid references public.musician_ads(id) on delete set null,
  order_id uuid references public.musician_marketplace_orders(id) on delete set null,
  reported_user_id uuid references auth.users(id) on delete set null,
  reason text not null check (char_length(reason) between 10 and 120),
  details text not null check (char_length(details) between 20 and 3000),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.musician_vetting enable row level security;
alter table public.musician_ads enable row level security;
alter table public.musician_ad_responses enable row level security;
alter table public.musician_marketplace_orders enable row level security;
alter table public.musician_marketplace_ledger enable row level security;
alter table public.musician_safety_reports enable row level security;

create or replace function public.is_marketplace_vetted(p_user uuid)
returns boolean
language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.musician_vetting v
    where v.user_id=p_user
      and v.status='approved'
      and (v.expires_at is null or v.expires_at > now())
  );
$$;

revoke all on function public.is_marketplace_vetted(uuid) from public;
grant execute on function public.is_marketplace_vetted(uuid) to anon, authenticated;

drop policy if exists "vetting owner read" on public.musician_vetting;
create policy "vetting owner read" on public.musician_vetting for select to authenticated
using (user_id=auth.uid() or public.is_admin());

drop policy if exists "vetting owner request" on public.musician_vetting;
create policy "vetting owner request" on public.musician_vetting for insert to authenticated
with check (
  user_id=auth.uid() and status='pending'
  and identity_checked=false and contact_checked=false and profile_checked=false
  and references_checked=false and organisation_checked=false and reviewed_at is null
);

drop policy if exists "admins manage vetting" on public.musician_vetting;
create policy "admins manage vetting" on public.musician_vetting for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public reads musician ads" on public.musician_ads;
create policy "public reads musician ads" on public.musician_ads for select
using ((status='published' and expires_at>now()) or owner_id=auth.uid() or public.is_admin());

drop policy if exists "vetted users create ads" on public.musician_ads;
create policy "vetted users create ads" on public.musician_ads for insert to authenticated
with check (owner_id=auth.uid() and public.is_marketplace_vetted(auth.uid()));

drop policy if exists "owners manage ads" on public.musician_ads;
create policy "owners manage ads" on public.musician_ads for update to authenticated
using (owner_id=auth.uid() or public.is_admin())
with check (owner_id=auth.uid() or public.is_admin());

drop policy if exists "owners delete ads" on public.musician_ads;
create policy "owners delete ads" on public.musician_ads for delete to authenticated
using (owner_id=auth.uid() or public.is_admin());

drop policy if exists "participants read responses" on public.musician_ad_responses;
create policy "participants read responses" on public.musician_ad_responses for select to authenticated
using (
  applicant_id=auth.uid()
  or exists(select 1 from public.musician_ads a where a.id=ad_id and a.owner_id=auth.uid())
  or public.is_admin()
);

drop policy if exists "vetted users respond" on public.musician_ad_responses;
create policy "vetted users respond" on public.musician_ad_responses for insert to authenticated
with check (
  applicant_id=auth.uid()
  and public.is_marketplace_vetted(auth.uid())
  and exists(select 1 from public.musician_ads a where a.id=ad_id and a.status='published' and a.expires_at>now() and a.owner_id<>auth.uid())
);

drop policy if exists "participants update responses" on public.musician_ad_responses;
create policy "participants update responses" on public.musician_ad_responses for update to authenticated
using (
  applicant_id=auth.uid()
  or exists(select 1 from public.musician_ads a where a.id=ad_id and a.owner_id=auth.uid())
  or public.is_admin()
);

drop policy if exists "order participants read" on public.musician_marketplace_orders;
create policy "order participants read" on public.musician_marketplace_orders for select to authenticated
using (buyer_id=auth.uid() or seller_id=auth.uid() or public.is_admin());

drop policy if exists "ledger participants read" on public.musician_marketplace_ledger;
create policy "ledger participants read" on public.musician_marketplace_ledger for select to authenticated
using (
  exists(select 1 from public.musician_marketplace_orders o where o.id=order_id and (o.buyer_id=auth.uid() or o.seller_id=auth.uid()))
  or public.is_admin()
);

drop policy if exists "users create safety reports" on public.musician_safety_reports;
create policy "users create safety reports" on public.musician_safety_reports for insert to authenticated
with check (reporter_id=auth.uid());

drop policy if exists "reporters read reports" on public.musician_safety_reports;
create policy "reporters read reports" on public.musician_safety_reports for select to authenticated
using (reporter_id=auth.uid() or public.is_admin());

create or replace function public.create_musician_marketplace_order(
  p_ad_id uuid,
  p_response_id uuid,
  p_seller_id uuid,
  p_description text,
  p_gross_amount numeric,
  p_currency text default 'ZAR'
) returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_buyer uuid := auth.uid();
  v_order uuid;
  v_fee numeric(14,2);
  v_net numeric(14,2);
begin
  if v_buyer is null then raise exception 'Authentication required'; end if;
  if not public.is_marketplace_vetted(v_buyer) then raise exception 'Buyer account is not approved for marketplace transactions'; end if;
  if not public.is_marketplace_vetted(p_seller_id) then raise exception 'Seller account is not approved for marketplace transactions'; end if;
  if v_buyer=p_seller_id then raise exception 'Buyer and seller must be different accounts'; end if;
  if p_gross_amount is null or p_gross_amount<=0 then raise exception 'Gross amount must be positive'; end if;
  if coalesce(trim(p_description),'')='' then raise exception 'A transaction description is required'; end if;

  v_fee := round(p_gross_amount * 0.10, 2);
  v_net := p_gross_amount - v_fee;

  insert into public.musician_marketplace_orders(
    ad_id,response_id,buyer_id,seller_id,created_by,description,currency,
    gross_amount,platform_fee_percent,platform_fee_amount,seller_net_amount,status
  ) values(
    p_ad_id,p_response_id,v_buyer,p_seller_id,v_buyer,trim(p_description),upper(p_currency),
    p_gross_amount,10,v_fee,v_net,'proposed'
  ) returning id into v_order;

  return v_order;
end;
$$;

revoke all on function public.create_musician_marketplace_order(uuid,uuid,uuid,text,numeric,text) from public;
grant execute on function public.create_musician_marketplace_order(uuid,uuid,uuid,text,numeric,text) to authenticated;

create index if not exists musician_ads_discovery_idx on public.musician_ads(status,expires_at,created_at desc);
create index if not exists musician_ads_owner_idx on public.musician_ads(owner_id,created_at desc);
create index if not exists musician_ad_responses_ad_idx on public.musician_ad_responses(ad_id,created_at desc);
create index if not exists musician_marketplace_orders_participants_idx on public.musician_marketplace_orders(buyer_id,seller_id,created_at desc);
create index if not exists musician_safety_reports_status_idx on public.musician_safety_reports(status,created_at desc);

-- =========================================================
-- SOURCE: supabase/migrations/20260924_merch_marketplace.sql
-- =========================================================
-- ALLEGRO-VIBEZ creator merchandise marketplace
-- ALLEGRO-owned stock may use owner_kind='platform'. Third-party creator stock uses owner_kind='creator'.
-- Third-party completed sales retain the fixed platform fee configured on the order.

create table if not exists public.merch_products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references auth.users(id) on delete cascade,
  owner_kind text not null default 'creator' check (owner_kind in ('creator','platform')),
  title text not null check (char_length(title) between 2 and 160),
  description text not null default '',
  product_type text not null default 'other'
    check (product_type in ('tshirt','hoodie','cap','jacket','poster','vinyl','cd','accessory','bundle','other')),
  price numeric(14,2) not null check (price >= 0),
  currency text not null default 'ZAR' check (char_length(currency)=3),
  image_url text,
  sizes text[] not null default '{}',
  colours text[] not null default '{}',
  stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),
  made_to_order boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((owner_kind='platform' and seller_id is null) or (owner_kind='creator' and seller_id is not null))
);

create table if not exists public.merch_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete restrict,
  seller_id uuid references auth.users(id) on delete restrict,
  owner_kind text not null check (owner_kind in ('creator','platform')),
  currency text not null default 'ZAR' check (char_length(currency)=3),
  subtotal numeric(14,2) not null check (subtotal >= 0),
  platform_fee_percent numeric(5,2) not null default 10 check (platform_fee_percent = 10),
  platform_fee_amount numeric(14,2) not null default 0,
  seller_net_amount numeric(14,2) not null default 0,
  shipping_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null check (total_amount >= 0),
  status text not null default 'cart'
    check (status in ('cart','payment_pending','paid','processing','shipped','delivered','cancelled','refunded')),
  payment_provider text,
  payment_reference text,
  shipping_name text,
  shipping_city text,
  shipping_country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (owner_kind='platform' and platform_fee_amount=0 and seller_net_amount=subtotal)
    or
    (owner_kind='creator' and platform_fee_amount=round(subtotal*0.10,2) and seller_net_amount=subtotal-platform_fee_amount)
  )
);

create table if not exists public.merch_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.merch_orders(id) on delete cascade,
  product_id uuid not null references public.merch_products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  selected_size text,
  selected_colour text,
  line_total numeric(14,2) not null check (line_total >= 0)
);

alter table public.merch_products enable row level security;
alter table public.merch_orders enable row level security;
alter table public.merch_order_items enable row level security;

drop policy if exists "public reads active merch" on public.merch_products;
create policy "public reads active merch" on public.merch_products
for select using (active=true or seller_id=auth.uid() or public.is_admin());

drop policy if exists "vetted creators create merch" on public.merch_products;
create policy "vetted creators create merch" on public.merch_products
for insert to authenticated
with check (
  owner_kind='creator'
  and seller_id=auth.uid()
  and public.is_marketplace_vetted(auth.uid())
);

drop policy if exists "creators manage own merch" on public.merch_products;
create policy "creators manage own merch" on public.merch_products
for update to authenticated
using (seller_id=auth.uid() or public.is_admin())
with check (seller_id=auth.uid() or public.is_admin());

drop policy if exists "buyers and sellers read merch orders" on public.merch_orders;
create policy "buyers and sellers read merch orders" on public.merch_orders
for select to authenticated
using (buyer_id=auth.uid() or seller_id=auth.uid() or public.is_admin());

drop policy if exists "buyers create merch orders" on public.merch_orders;
create policy "buyers create merch orders" on public.merch_orders
for insert to authenticated with check (buyer_id=auth.uid());

drop policy if exists "participants read merch items" on public.merch_order_items;
create policy "participants read merch items" on public.merch_order_items
for select to authenticated
using (
  exists(select 1 from public.merch_orders o where o.id=order_id and (o.buyer_id=auth.uid() or o.seller_id=auth.uid()))
  or public.is_admin()
);

create or replace function public.create_merch_order(
  p_product_id uuid,
  p_quantity integer,
  p_size text default null,
  p_colour text default null
) returns uuid
language plpgsql
security definer set search_path=public
as $$
declare
  v_product public.merch_products;
  v_order uuid;
  v_subtotal numeric(14,2);
  v_fee numeric(14,2);
  v_net numeric(14,2);
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_quantity is null or p_quantity<=0 then raise exception 'Quantity must be positive'; end if;

  select * into v_product from public.merch_products
  where id=p_product_id and active=true
  for update;
  if not found then raise exception 'Product unavailable'; end if;
  if v_product.stock_quantity is not null and v_product.stock_quantity < p_quantity then
    raise exception 'Insufficient stock';
  end if;

  v_subtotal:=round(v_product.price*p_quantity,2);
  if v_product.owner_kind='creator' then
    v_fee:=round(v_subtotal*0.10,2);
    v_net:=v_subtotal-v_fee;
  else
    v_fee:=0;
    v_net:=v_subtotal;
  end if;

  insert into public.merch_orders(
    buyer_id,seller_id,owner_kind,currency,subtotal,platform_fee_percent,
    platform_fee_amount,seller_net_amount,total_amount,status
  ) values(
    auth.uid(),v_product.seller_id,v_product.owner_kind,v_product.currency,v_subtotal,10,
    v_fee,v_net,v_subtotal,'payment_pending'
  ) returning id into v_order;

  insert into public.merch_order_items(order_id,product_id,quantity,unit_price,selected_size,selected_colour,line_total)
  values(v_order,p_product_id,p_quantity,v_product.price,p_size,p_colour,v_subtotal);

  return v_order;
end;
$$;

revoke all on function public.create_merch_order(uuid,integer,text,text) from public;
grant execute on function public.create_merch_order(uuid,integer,text,text) to authenticated;

-- =========================================================
-- SOURCE: supabase/migrations/20260925_merch_commerce_hardening.sql
-- =========================================================
-- ALLEGRO-VIBEZ merch hardening and official-store administration
-- Keeps creator commerce server-enforced and allows trusted admins to seed official platform stock.

drop policy if exists "buyers create merch orders" on public.merch_orders;

drop policy if exists "admins create official merch" on public.merch_products;
create policy "admins create official merch" on public.merch_products
for insert to authenticated
with check (
  owner_kind='platform'
  and seller_id is null
  and public.is_admin()
);

drop policy if exists "admins delete merch" on public.merch_products;
create policy "admins delete merch" on public.merch_products
for delete to authenticated
using (public.is_admin());

comment on table public.merch_orders is
'ALLEGRO merch orders. Client-side direct inserts are blocked; authenticated buyers create orders through create_merch_order so creator marketplace fees remain server-calculated.';
