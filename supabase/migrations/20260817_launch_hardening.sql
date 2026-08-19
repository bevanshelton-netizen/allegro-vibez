-- ALLEGRO-VIBEZ launch hardening
-- Apply after all 20260813 migrations.

create or replace function public.request_payout(p_amount numeric, p_destination_label text default null)
returns public.payout_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.creator_wallets;
  v_reserved numeric(14,2);
  v_request public.payout_requests;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Payout amount must be greater than zero'; end if;

  select * into v_wallet from public.creator_wallets where owner_id = auth.uid() for update;
  if v_wallet.owner_id is null then raise exception 'Creator wallet not found'; end if;

  select coalesce(sum(amount),0)::numeric(14,2) into v_reserved
  from public.payout_requests
  where owner_id = auth.uid() and status in ('requested','approved','processing');

  if p_amount > (v_wallet.available_balance - v_reserved) then
    raise exception 'Requested amount exceeds currently withdrawable balance';
  end if;

  insert into public.payout_requests(owner_id,currency,amount,destination_label)
  values(auth.uid(),v_wallet.currency,p_amount,nullif(trim(p_destination_label),''))
  returning * into v_request;

  return v_request;
end;
$$;

grant execute on function public.request_payout(numeric,text) to authenticated;

create or replace function public.admin_update_payout(
  p_request_id uuid,
  p_status text,
  p_admin_note text default null,
  p_external_reference text default null
)
returns public.payout_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.payout_requests;
  v_wallet public.creator_wallets;
  v_previous_status text;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('approved','processing','paid','rejected') then raise exception 'Invalid payout status'; end if;

  select * into v_request from public.payout_requests where id = p_request_id for update;
  if v_request.id is null then raise exception 'Payout request not found'; end if;

  v_previous_status := v_request.status;
  if v_previous_status in ('paid','rejected') then raise exception 'Finalised payout cannot be changed'; end if;

  if p_status = 'paid' then
    select * into v_wallet from public.creator_wallets where owner_id = v_request.owner_id for update;
    if v_wallet.owner_id is null then raise exception 'Creator wallet not found'; end if;
    if v_wallet.available_balance < v_request.amount then raise exception 'Wallet balance is insufficient to mark this payout paid'; end if;

    update public.creator_wallets
    set available_balance = available_balance - v_request.amount,
        lifetime_paid = lifetime_paid + v_request.amount,
        updated_at = now()
    where owner_id = v_request.owner_id;
  end if;

  update public.payout_requests
  set status = p_status,
      admin_note = coalesce(nullif(trim(p_admin_note),''),admin_note),
      external_reference = coalesce(nullif(trim(p_external_reference),''),external_reference),
      processed_at = case when p_status in ('paid','rejected') then now() else processed_at end
  where id = p_request_id
  returning * into v_request;

  return v_request;
end;
$$;

grant execute on function public.admin_update_payout(uuid,text,text,text) to authenticated;

drop policy if exists "creator requests payout" on public.payout_requests;

alter table public.release_contributors drop constraint if exists release_contributors_share_percent_check;
alter table public.release_contributors add constraint release_contributors_share_percent_check check (share_percent >= 0 and share_percent <= 100);
