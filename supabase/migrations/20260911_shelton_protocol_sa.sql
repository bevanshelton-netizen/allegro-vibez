-- SHELTON PROTOCOL™ South Africa layer for ALLEGRO-VIBEZ
-- Exclusive eligibility and readiness records for qualifying South African creatives.
-- This schema does not provide insurance, financial advice or underwriting.

create table if not exists public.shelton_protocol_passports (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  eligibility_basis text not null check (eligibility_basis in ('south_african_citizen','permanent_resident','sa_registered_creative_entity')),
  province text not null check (province in ('Eastern Cape','Free State','Gauteng','KwaZulu-Natal','Limpopo','Mpumalanga','Northern Cape','North West','Western Cape')),
  primary_sector text not null,
  supporting_entity_name text,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected','suspended')),
  protocol_status text not null default 'registered' check (protocol_status in ('registered','verified','protocol_ready','protected','commercial_ready','investment_ready')),
  readiness_score smallint not null default 0 check (readiness_score between 0 and 100),
  public_badge_enabled boolean not null default false,
  declarations jsonb not null default '{}'::jsonb,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shelton_protocol_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  asset_type text not null,
  asset_name text not null,
  description text,
  estimated_value numeric(14,2) check (estimated_value is null or estimated_value >= 0),
  currency text not null default 'ZAR' check (char_length(currency)=3),
  ownership_basis text,
  protection_status text not null default 'unassessed' check (protection_status in ('unassessed','interest_recorded','assessment_pending','protected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shelton_protocol_ip_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  ip_type text not null,
  proof_type text,
  external_reference text,
  linked_release_id uuid references public.releases(id) on delete set null,
  verification_status text not null default 'self_declared' check (verification_status in ('self_declared','evidence_supplied','verified','disputed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shelton_protocol_protection_interests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  cover_type text not null,
  notes text,
  status text not null default 'interest_recorded' check (status in ('interest_recorded','assessment_pending','referred_to_partner','quoted','bound','declined','closed')),
  licensed_partner_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shelton_protocol_passports enable row level security;
alter table public.shelton_protocol_assets enable row level security;
alter table public.shelton_protocol_ip_records enable row level security;
alter table public.shelton_protocol_protection_interests enable row level security;

revoke all on table public.shelton_protocol_passports from anon, authenticated;
revoke all on table public.shelton_protocol_assets from anon, authenticated;
revoke all on table public.shelton_protocol_ip_records from anon, authenticated;
revoke all on table public.shelton_protocol_protection_interests from anon, authenticated;

grant select, insert on table public.shelton_protocol_passports to authenticated;
grant update (eligibility_basis, province, primary_sector, supporting_entity_name, public_badge_enabled, declarations, updated_at) on public.shelton_protocol_passports to authenticated;
grant select, insert, update, delete on table public.shelton_protocol_assets to authenticated;
grant select, insert, update, delete on table public.shelton_protocol_ip_records to authenticated;
grant select, insert, update, delete on table public.shelton_protocol_protection_interests to authenticated;

create policy "protocol owner reads passport"
  on public.shelton_protocol_passports for select
  to authenticated
  using ((select auth.uid()) = owner_id or public.is_admin());

create policy "protocol owner creates registered passport"
  on public.shelton_protocol_passports for insert
  to authenticated
  with check (
    (select auth.uid()) = owner_id
    and verification_status = 'pending'
    and protocol_status = 'registered'
    and readiness_score = 0
    and verified_at is null
  );

create policy "protocol owner updates editable passport"
  on public.shelton_protocol_passports for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "protocol owner reads assets"
  on public.shelton_protocol_assets for select
  to authenticated
  using ((select auth.uid()) = owner_id or public.is_admin());
create policy "protocol owner creates assets"
  on public.shelton_protocol_assets for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "protocol owner updates assets"
  on public.shelton_protocol_assets for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "protocol owner deletes assets"
  on public.shelton_protocol_assets for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "protocol owner reads ip records"
  on public.shelton_protocol_ip_records for select
  to authenticated
  using ((select auth.uid()) = owner_id or public.is_admin());
create policy "protocol owner creates ip records"
  on public.shelton_protocol_ip_records for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "protocol owner updates ip records"
  on public.shelton_protocol_ip_records for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "protocol owner deletes ip records"
  on public.shelton_protocol_ip_records for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "protocol owner reads protection interests"
  on public.shelton_protocol_protection_interests for select
  to authenticated
  using ((select auth.uid()) = owner_id or public.is_admin());
create policy "protocol owner creates protection interests"
  on public.shelton_protocol_protection_interests for insert
  to authenticated
  with check (
    (select auth.uid()) = owner_id
    and status = 'interest_recorded'
    and licensed_partner_reference is null
  );
create policy "protocol owner updates protection interest notes"
  on public.shelton_protocol_protection_interests for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "protocol owner deletes unsubmitted protection interests"
  on public.shelton_protocol_protection_interests for delete
  to authenticated
  using ((select auth.uid()) = owner_id and status = 'interest_recorded');

create index if not exists shelton_protocol_assets_owner_idx on public.shelton_protocol_assets(owner_id);
create index if not exists shelton_protocol_ip_owner_idx on public.shelton_protocol_ip_records(owner_id);
create index if not exists shelton_protocol_protection_owner_idx on public.shelton_protocol_protection_interests(owner_id);
