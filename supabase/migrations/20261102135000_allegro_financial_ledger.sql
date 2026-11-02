-- ALLEGRO Financial Truth Layer
-- Apply this migration to the dedicated ALLEGRO Supabase project.
-- Wallet balances are derived from ledger events; UI balances are never authoritative.

create table if not exists public.allegro_financial_ledger (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null,
  source_type text not null check (source_type in ('recorded_music','live_performance','booking','sponsorship','commerce','adjustment')),
  source_id text not null,
  event_type text not null check (event_type in ('pending','earned','verified','available','paid','disputed','void')),
  amount numeric(18,2) not null check (amount >= 0),
  currency text not null default 'ZAR' check (char_length(currency) = 3),
  description text,
  occurred_at timestamptz not null default now(),
  verified_at timestamptz,
  paid_at timestamptz,
  payout_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_allegro_financial_ledger_artist on public.allegro_financial_ledger(artist_id, created_at desc);
create index if not exists idx_allegro_financial_ledger_source on public.allegro_financial_ledger(source_type, source_id);
create index if not exists idx_allegro_financial_ledger_status on public.allegro_financial_ledger(event_type);

create table if not exists public.allegro_payout_requests (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null,
  amount numeric(18,2) not null check (amount > 0),
  currency text not null default 'ZAR' check (char_length(currency) = 3),
  status text not null default 'requested' check (status in ('requested','approved','processing','paid','rejected','cancelled')),
  payout_destination jsonb not null default '{}'::jsonb,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  external_reference text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_allegro_payout_requests_artist on public.allegro_payout_requests(artist_id, requested_at desc);

create or replace view public.allegro_artist_wallet as
select artist_id, currency,
  coalesce(sum(amount) filter (where event_type in ('pending','earned','verified')),0) as accrued_amount,
  coalesce(sum(amount) filter (where event_type = 'available'),0) as available_amount,
  coalesce(sum(amount) filter (where event_type = 'paid'),0) as paid_amount,
  coalesce(sum(amount) filter (where event_type = 'disputed'),0) as disputed_amount
from public.allegro_financial_ledger
group by artist_id, currency;

comment on table public.allegro_financial_ledger is 'Authoritative ALLEGRO financial event ledger. Wallet balances are derived from verified ledger events.';
comment on table public.allegro_payout_requests is 'Artist payout requests; a request never creates earnings.';
