-- Harden PayFast transaction activation against duplicate/replayed ITNs.
alter table public.payment_transactions
  add column if not exists activated_at timestamptz;

create unique index if not exists payment_transactions_provider_payment_id_unique
  on public.payment_transactions(provider_payment_id)
  where provider_payment_id is not null;

create or replace function public.activate_paid_subscription(p_transaction_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_payment public.payment_transactions;
begin
  select * into v_payment
  from public.payment_transactions
  where id=p_transaction_id
  for update;

  if v_payment.id is null or v_payment.status <> 'complete' then
    raise exception 'Verified completed payment required';
  end if;

  -- A valid PayFast ITN can be retried. Never grant the same purchase twice.
  if v_payment.activated_at is not null then
    return;
  end if;

  insert into public.creator_subscriptions(owner_id,plan_code,status,current_period_start,current_period_end)
  values(v_payment.owner_id,v_payment.plan_code,'active',now(),now()+interval '1 month')
  on conflict(owner_id) do update
    set plan_code=excluded.plan_code,
        status='active',
        current_period_start=now(),
        current_period_end=now()+interval '1 month',
        updated_at=now();

  update public.payment_transactions
  set activated_at=now(), updated_at=now()
  where id=p_transaction_id;
end;
$$;

revoke all on function public.activate_paid_subscription(uuid) from public,anon,authenticated;
grant execute on function public.activate_paid_subscription(uuid) to service_role;
