-- Secure PayFast checkout and webhook audit trail.
create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null references public.subscription_plans(code),
  provider text not null default 'payfast' check (provider = 'payfast'),
  merchant_payment_id text not null unique,
  provider_payment_id text,
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'ZAR',
  status text not null default 'created' check (status in ('created','pending','complete','failed','cancelled')),
  raw_notification jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_transactions_owner_idx on public.payment_transactions(owner_id,created_at desc);
alter table public.payment_transactions enable row level security;

drop policy if exists "owners view payment transactions" on public.payment_transactions;
create policy "owners view payment transactions" on public.payment_transactions
for select to authenticated using (owner_id = auth.uid() or public.is_admin());

-- Inserts and status changes are service-role only through Edge Functions.
create or replace function public.activate_paid_subscription(p_transaction_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_payment public.payment_transactions;
begin
  select * into v_payment from public.payment_transactions where id=p_transaction_id for update;
  if v_payment.id is null or v_payment.status <> 'complete' then raise exception 'Verified completed payment required'; end if;
  insert into public.creator_subscriptions(owner_id,plan_code,status,current_period_start,current_period_end)
  values(v_payment.owner_id,v_payment.plan_code,'active',now(),now()+interval '1 month')
  on conflict(owner_id) do update set plan_code=excluded.plan_code,status='active',current_period_start=now(),current_period_end=now()+interval '1 month',updated_at=now();
end; $$;
revoke all on function public.activate_paid_subscription(uuid) from public,anon,authenticated;
grant execute on function public.activate_paid_subscription(uuid) to service_role;
