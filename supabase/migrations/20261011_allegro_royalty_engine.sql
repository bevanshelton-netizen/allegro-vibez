-- ALLEGRO RIGHTS & ROYALTIES
-- Commercial rule: ALLEGRO retains 10% of royalties collected through the platform;
-- the creator royalty pool receives 90%.
-- This is an administration/platform fee model. It does not transfer copyright ownership.

create or replace function public.allegro_royalty_split(p_gross numeric)
returns table(platform_fee numeric, creator_net numeric, platform_fee_bps integer, creator_share_bps integer)
language sql
immutable
as $$
  select
    round(greatest(coalesce(p_gross, 0), 0) * 0.10, 2),
    round(greatest(coalesce(p_gross, 0), 0) * 0.90, 2),
    1000,
    9000;
$$;

-- If the royalty ledger already exists, make the commercial rule explicit.
-- New writes should use allegro_royalty_split() rather than accepting a client-calculated fee.
create or replace function public.allegro_prepare_royalty_line(
  p_gross numeric,
  p_source text,
  p_territory text default 'Global',
  p_currency text default 'ZAR',
  p_statement_period text default null,
  p_external_reference text default null
)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'source', p_source,
    'territory', coalesce(p_territory, 'Global'),
    'currency', upper(coalesce(p_currency, 'ZAR')),
    'gross_amount', round(greatest(coalesce(p_gross, 0), 0), 2),
    'platform_fee', round(greatest(coalesce(p_gross, 0), 0) * 0.10, 2),
    'net_amount', round(greatest(coalesce(p_gross, 0), 0) * 0.90, 2),
    'platform_fee_bps', 1000,
    'creator_share_bps', 9000,
    'statement_period', p_statement_period,
    'external_reference', p_external_reference
  );
$$;

comment on function public.allegro_royalty_split(numeric) is
'ALLEGRO commercial royalty rule: 10% platform/admin fee, 90% creator royalty pool. Copyright ownership is unchanged.';
