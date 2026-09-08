-- Lock ALLEGRO creator platform share at 10% by default.
-- ALLEGRO-owned advertising/sponsorship revenue is company revenue and is not a 10/90 creator split.

create table if not exists public.platform_fee_policy (
  id boolean primary key default true check (id),
  default_fee_bps integer not null default 1000 check (default_fee_bps between 0 and 10000),
  updated_at timestamptz not null default now()
);

insert into public.platform_fee_policy(id,default_fee_bps)
values(true,1000)
on conflict(id) do update set default_fee_bps=1000,updated_at=now();

create table if not exists public.platform_fee_overrides (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  fee_bps integer not null check (fee_bps between 0 and 10000),
  agreement_reference text not null check (char_length(trim(agreement_reference)) >= 3),
  reason text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  active boolean not null default true,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

alter table public.platform_fee_overrides enable row level security;

create policy "creator reads own fee overrides"
on public.platform_fee_overrides for select
using (owner_id = auth.uid() or public.is_admin());

create policy "admins manage fee overrides"
on public.platform_fee_overrides for all
using (public.is_admin())
with check (public.is_admin());

update public.subscription_plans
set platform_fee_percent = 10
where platform_fee_percent <> 10;

alter table public.subscription_plans
  alter column platform_fee_percent set default 10;

create or replace function public.effective_platform_fee_bps(p_owner_id uuid, p_at timestamptz default now())
returns integer
language sql
stable
security definer
set search_path=public
as $$
  select coalesce(
    (
      select o.fee_bps
      from public.platform_fee_overrides o
      where o.owner_id=p_owner_id
        and o.active=true
        and o.starts_at<=p_at
        and (o.ends_at is null or o.ends_at>p_at)
      order by o.starts_at desc
      limit 1
    ),
    (select default_fee_bps from public.platform_fee_policy where id=true),
    1000
  );
$$;

create or replace function public.apply_allegro_platform_fee()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_bps integer;
begin
  if new.gross_amount < 0 then
    raise exception 'gross_amount cannot be negative';
  end if;

  v_bps := public.effective_platform_fee_bps(new.owner_id, coalesce(new.created_at,now()));
  new.platform_fee := round((new.gross_amount * v_bps::numeric) / 10000, 2);
  return new;
end;
$$;

drop trigger if exists royalty_ledger_apply_allegro_fee on public.royalty_ledger;
create trigger royalty_ledger_apply_allegro_fee
before insert or update of gross_amount,owner_id,created_at
on public.royalty_ledger
for each row execute procedure public.apply_allegro_platform_fee();

comment on table public.platform_fee_overrides is
'Any departure from ALLEGRO default 10% creator platform share requires an explicit signed agreement reference.';

comment on function public.effective_platform_fee_bps(uuid,timestamptz) is
'Returns ALLEGRO creator platform share in basis points; default 1000 = 10%.';

-- Recalculate existing ledger rows using the policy/override effective now.
update public.royalty_ledger
set gross_amount = gross_amount;
