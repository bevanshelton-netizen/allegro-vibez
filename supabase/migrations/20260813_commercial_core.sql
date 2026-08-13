-- ALLEGRO-VIBEZ commercial core
-- Apply after creator, rights and workflow/prosperity migrations.

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
create trigger on_auth_user_commercial_created
after insert on auth.users
for each row execute procedure public.ensure_creator_commercial_accounts();

insert into public.creator_subscriptions(owner_id,plan_code,status)
select id,'free','active' from auth.users on conflict(owner_id) do nothing;
insert into public.creator_wallets(owner_id,currency)
select id,'ZAR' from auth.users on conflict(owner_id) do nothing;
