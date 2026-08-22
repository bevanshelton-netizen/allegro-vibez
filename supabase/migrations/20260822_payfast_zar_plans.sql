-- Align ALLEGRO-VIBEZ paid plans with PayFast's ZAR checkout.
-- Safe to run after the commercial core migration.

update public.subscription_plans
set monthly_price = 0,
    currency = 'ZAR',
    platform_fee_percent = 10,
    active = true
where code = 'free';

update public.subscription_plans
set monthly_price = 179,
    currency = 'ZAR',
    platform_fee_percent = 8,
    active = true
where code = 'pro';

update public.subscription_plans
set monthly_price = 899,
    currency = 'ZAR',
    platform_fee_percent = 6,
    active = true
where code = 'label';
