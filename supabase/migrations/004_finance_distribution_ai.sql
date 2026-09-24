-- ALLEGRO-VIBEZ V1 finance, distribution and AI-readiness controls.
-- Additive migration. Review against the target project before running.

alter table public.payout_requests add column if not exists idempotency_key text;
create unique index if not exists payout_requests_user_idempotency_unique
  on public.payout_requests(user_id,idempotency_key) where idempotency_key is not null;

create table if not exists public.payout_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  provider_reference text not null,
  label text not null,
  status text not null default 'pending' check (status in ('pending','verified','disabled')),
  created_at timestamptz not null default now(),
  unique(user_id,provider,provider_reference)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_code text not null default 'free',
  provider text,
  provider_reference text,
  status text not null default 'active' check (status in ('active','trialing','past_due','cancelled','expired')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  provider_reference text,
  amount numeric(14,2) not null default 0,
  currency text not null default 'ZAR',
  status text not null default 'open' check (status in ('open','paid','void','uncollectible')),
  issued_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null unique,
  event_type text not null,
  verified boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.distribution_orders (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  release_version integer not null default 1,
  status text not null default 'queued' check (status in ('not_ready','ready','queued','submitted','acknowledged','processing','live_partial','live','failed','correction_required','takedown_pending','taken_down')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(release_id,release_version)
);

create table if not exists public.distribution_targets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.distribution_orders(id) on delete cascade,
  store_name text not null,
  status text not null default 'queued' check (status in ('queued','submitted','acknowledged','processing','live','failed','correction_required','taken_down')),
  external_reference text,
  error_message text,
  updated_at timestamptz not null default now(),
  unique(order_id,store_name)
);

create table if not exists public.distribution_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.distribution_orders(id) on delete cascade,
  target_id uuid references public.distribution_targets(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_type text not null,
  consent_confirmed boolean not null default false,
  input_summary text,
  provider text,
  provider_reference text,
  status text not null default 'prepared' check (status in ('prepared','queued','completed','failed','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.ai_outputs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.ai_requests(id) on delete cascade,
  output_text text not null,
  created_at timestamptz not null default now()
);

alter table public.payout_methods enable row level security;
alter table public.subscriptions enable row level security;
alter table public.invoices enable row level security;
alter table public.billing_events enable row level security;
alter table public.distribution_orders enable row level security;
alter table public.distribution_targets enable row level security;
alter table public.distribution_events enable row level security;
alter table public.ai_requests enable row level security;
alter table public.ai_outputs enable row level security;

drop policy if exists "payout methods owner read" on public.payout_methods;
create policy "payout methods owner read" on public.payout_methods for select using (user_id=auth.uid() or public.current_role() in ('finance_admin','super_admin'));

drop policy if exists "subscription owner read" on public.subscriptions;
create policy "subscription owner read" on public.subscriptions for select using (user_id=auth.uid() or public.current_role() in ('finance_admin','super_admin'));

drop policy if exists "invoice owner read" on public.invoices;
create policy "invoice owner read" on public.invoices for select using (user_id=auth.uid() or public.current_role() in ('finance_admin','super_admin'));

drop policy if exists "billing admin read" on public.billing_events;
create policy "billing admin read" on public.billing_events for select using (public.current_role() in ('finance_admin','super_admin'));

drop policy if exists "distribution owner read" on public.distribution_orders;
create policy "distribution owner read" on public.distribution_orders for select using (user_id=auth.uid() or public.current_role() in ('admin','super_admin','moderator'));

drop policy if exists "distribution target owner read" on public.distribution_targets;
create policy "distribution target owner read" on public.distribution_targets for select using (
  exists(select 1 from public.distribution_orders o where o.id=order_id and (o.user_id=auth.uid() or public.current_role() in ('admin','super_admin','moderator')))
);

drop policy if exists "distribution event owner read" on public.distribution_events;
create policy "distribution event owner read" on public.distribution_events for select using (
  exists(select 1 from public.distribution_orders o where o.id=order_id and (o.user_id=auth.uid() or public.current_role() in ('admin','super_admin','moderator')))
);

drop policy if exists "ai request owner read" on public.ai_requests;
create policy "ai request owner read" on public.ai_requests for select using (user_id=auth.uid() or public.current_role() in ('admin','super_admin'));
drop policy if exists "ai request owner insert" on public.ai_requests;
create policy "ai request owner insert" on public.ai_requests for insert with check (user_id=auth.uid());

drop policy if exists "ai output owner read" on public.ai_outputs;
create policy "ai output owner read" on public.ai_outputs for select using (
  exists(select 1 from public.ai_requests r where r.id=request_id and (r.user_id=auth.uid() or public.current_role() in ('admin','super_admin')))
);

create or replace function public.request_payout(p_amount numeric, p_idempotency_key text)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid := auth.uid();
  v_wallet public.wallets%rowtype;
  v_request_id uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Payout amount must be positive'; end if;
  if coalesce(trim(p_idempotency_key),'')='' then raise exception 'Idempotency key required'; end if;

  select * into v_wallet from public.wallets where user_id=v_user for update;
  if not found then raise exception 'Wallet not found'; end if;

  select id into v_request_id from public.payout_requests
  where user_id=v_user and idempotency_key=p_idempotency_key;
  if v_request_id is not null then return v_request_id; end if;

  if v_wallet.available_balance < p_amount then raise exception 'Payout exceeds available balance'; end if;

  update public.wallets
  set available_balance=available_balance-p_amount,
      on_hold_balance=on_hold_balance+p_amount,
      updated_at=now()
  where id=v_wallet.id;

  insert into public.payout_requests(user_id,amount,currency,status,idempotency_key)
  values(v_user,p_amount,v_wallet.currency,'requested',p_idempotency_key)
  returning id into v_request_id;

  insert into public.wallet_transactions(wallet_id,amount,direction,transaction_type,reference)
  values(v_wallet.id,p_amount,'debit','payout_reserve',v_request_id::text);

  insert into public.audit_logs(actor_id,action,target_type,target_id,reason,metadata)
  values(v_user,'payout_requested','payout_request',v_request_id,'Creator requested payout',jsonb_build_object('amount',p_amount,'currency',v_wallet.currency));

  return v_request_id;
end;
$$;

grant execute on function public.request_payout(numeric,text) to authenticated;

create or replace function public.create_distribution_order(p_release_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid := auth.uid();
  v_order uuid;
  v_owner uuid;
  v_status text;
  v_role text := public.current_role();
  v_store text;
  v_stores text[] := array['Spotify','Apple Music','YouTube Music','Amazon Music','Deezer','TIDAL','TikTok / CapCut','Meta Music'];
begin
  if v_role not in ('admin','super_admin','moderator') then raise exception 'Admin distribution role required'; end if;
  select user_id,status into v_owner,v_status from public.releases where id=p_release_id;
  if v_owner is null then raise exception 'Release not found'; end if;
  if v_status <> 'approved' then raise exception 'Release must be approved before distribution'; end if;

  insert into public.distribution_orders(release_id,user_id,status,created_by)
  values(p_release_id,v_owner,'queued',v_actor)
  on conflict(release_id,release_version) do update set updated_at=now()
  returning id into v_order;

  foreach v_store in array v_stores loop
    insert into public.distribution_targets(order_id,store_name,status)
    values(v_order,v_store,'queued') on conflict(order_id,store_name) do nothing;
  end loop;

  insert into public.distribution_events(order_id,actor_id,event_type,status)
  values(v_order,v_actor,'order_created','queued');

  insert into public.audit_logs(actor_id,action,target_type,target_id,reason)
  values(v_actor,'distribution_order_created','distribution_order',v_order,'Approved release queued for partner-assisted distribution');
  return v_order;
end;
$$;

grant execute on function public.create_distribution_order(uuid) to authenticated;

create or replace function public.update_distribution_target(
  p_target_id uuid,
  p_status text,
  p_external_reference text default null,
  p_error_message text default null
) returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := public.current_role();
  v_order uuid;
  v_order_status text;
begin
  if v_role not in ('admin','super_admin','moderator') then raise exception 'Admin distribution role required'; end if;
  if p_status not in ('queued','submitted','acknowledged','processing','live','failed','correction_required','taken_down') then raise exception 'Invalid target status'; end if;

  update public.distribution_targets
  set status=p_status, external_reference=coalesce(p_external_reference,external_reference), error_message=p_error_message, updated_at=now()
  where id=p_target_id returning order_id into v_order;
  if v_order is null then raise exception 'Distribution target not found'; end if;

  if exists(select 1 from public.distribution_targets where order_id=v_order and status='failed') then
    v_order_status := 'failed';
  elsif exists(select 1 from public.distribution_targets where order_id=v_order and status='live') and exists(select 1 from public.distribution_targets where order_id=v_order and status<>'live') then
    v_order_status := 'live_partial';
  elsif not exists(select 1 from public.distribution_targets where order_id=v_order and status<>'live') then
    v_order_status := 'live';
  elsif exists(select 1 from public.distribution_targets where order_id=v_order and status in ('acknowledged','processing')) then
    v_order_status := 'processing';
  else
    v_order_status := 'queued';
  end if;

  update public.distribution_orders set status=v_order_status,updated_at=now() where id=v_order;
  insert into public.distribution_events(order_id,target_id,actor_id,event_type,status,metadata)
  values(v_order,p_target_id,v_actor,'target_status_changed',p_status,jsonb_build_object('external_reference',p_external_reference,'error_message',p_error_message));
  return p_target_id;
end;
$$;

grant execute on function public.update_distribution_target(uuid,text,text,text) to authenticated;
