-- ALLEGRO-VIBEZ DROP 01 preorder campaign ledger
-- Public UI may read aggregate progress only. Individual payment references remain private.
-- Verified receipts can be written by trusted admins or server-side commerce automation.

create table if not exists public.merch_campaigns (
  code text primary key,
  name text not null,
  target_amount numeric(14,2) not null check (target_amount > 0),
  currency text not null default 'ZAR' check (char_length(currency)=3),
  status text not null default 'preparing'
    check (status in ('preparing','open','closed','fulfilled')),
  production_mode text not null default 'preorder'
    check (production_mode in ('preorder','stock')),
  opens_at timestamptz,
  closes_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.merch_campaign_receipts (
  id uuid primary key default gen_random_uuid(),
  campaign_code text not null references public.merch_campaigns(code) on delete restrict,
  payment_provider text not null default 'iKhokha',
  payment_reference text not null,
  amount numeric(14,2) not null check (amount >= 0),
  refunded_amount numeric(14,2) not null default 0
    check (refunded_amount >= 0 and refunded_amount <= amount),
  currency text not null default 'ZAR' check (char_length(currency)=3),
  quantity integer not null default 1 check (quantity > 0),
  status text not null default 'paid'
    check (status in ('paid','partially_refunded','refunded')),
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(payment_provider,payment_reference)
);

alter table public.merch_campaigns enable row level security;
alter table public.merch_campaign_receipts enable row level security;

drop policy if exists "public reads merch campaigns" on public.merch_campaigns;
create policy "public reads merch campaigns" on public.merch_campaigns
for select using (true);

drop policy if exists "admins manage merch campaigns" on public.merch_campaigns;
create policy "admins manage merch campaigns" on public.merch_campaigns
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins manage merch campaign receipts" on public.merch_campaign_receipts;
create policy "admins manage merch campaign receipts" on public.merch_campaign_receipts
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.merch_campaigns(code,name,target_amount,currency,status,production_mode)
values('AV-DROP-01','ALLEGRO-VIBEZ DROP 01',100000,'ZAR','preparing','preorder')
on conflict(code) do update set
  name=excluded.name,
  target_amount=excluded.target_amount,
  currency=excluded.currency,
  production_mode=excluded.production_mode,
  updated_at=now();

create or replace function public.get_merch_campaign_progress(p_campaign_code text)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'code', c.code,
    'name', c.name,
    'target_amount', c.target_amount,
    'currency', c.currency,
    'status', c.status,
    'paid_sales', coalesce(sum(
      case
        when r.status='refunded' then 0
        else greatest(r.amount-r.refunded_amount,0)
      end
    ),0),
    'payment_count', count(r.id) filter (where r.status <> 'refunded'),
    'units', coalesce(sum(
      case when r.status='refunded' then 0 else r.quantity end
    ),0)
  )
  from public.merch_campaigns c
  left join public.merch_campaign_receipts r on r.campaign_code=c.code
  where c.code=p_campaign_code
  group by c.code,c.name,c.target_amount,c.currency,c.status;
$$;

revoke all on function public.get_merch_campaign_progress(text) from public;
grant execute on function public.get_merch_campaign_progress(text) to anon, authenticated;

comment on table public.merch_campaign_receipts is
'Private verified-payment ledger for merch campaign reporting. Do not expose payment references in public UI.';

comment on function public.get_merch_campaign_progress(text) is
'Returns aggregate merch campaign progress only: verified net paid sales, receipt count and units. Unpaid carts are excluded.';
