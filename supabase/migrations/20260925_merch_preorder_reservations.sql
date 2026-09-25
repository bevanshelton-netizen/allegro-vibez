-- ALLEGRO-VIBEZ DROP 01 reservation funnel
-- Captures authenticated purchase intent while checkout is fail-closed.
-- Reservations are not paid orders, do not reserve production and never count toward verified sales.

create table if not exists public.allegro_merch_reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_ref text not null unique,
  buyer_user_id uuid not null,
  buyer_email text not null,
  customer_name text not null,
  mobile text not null,
  product_id text not null,
  sku text not null,
  product_name text not null,
  colour text not null,
  size text not null,
  quantity integer not null check (quantity between 1 and 4),
  unit_amount_cents integer not null check (unit_amount_cents > 0),
  intended_amount_cents integer not null check (intended_amount_cents > 0),
  currency text not null default 'ZAR' check (currency='ZAR'),
  campaign_code text not null default 'AV-DROP-01',
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment','payment_started','paid','cancelled','expired','converted')),
  source text not null default 'allegro-merch',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.allegro_merch_reservations enable row level security;
revoke all on table public.allegro_merch_reservations from anon, authenticated;

create index if not exists allegro_merch_reservations_buyer_idx
  on public.allegro_merch_reservations (buyer_user_id,created_at desc);

create index if not exists allegro_merch_reservations_campaign_status_idx
  on public.allegro_merch_reservations (campaign_code,status,created_at desc);

create unique index if not exists allegro_merch_reservations_active_unique
  on public.allegro_merch_reservations (buyer_user_id,product_id,size,campaign_code)
  where status='awaiting_payment';

comment on table public.allegro_merch_reservations is
'Authenticated DROP 01 purchase intent captured while payment is unavailable. Rows are not paid orders, do not reserve production and must not contribute to verified sales totals.';
