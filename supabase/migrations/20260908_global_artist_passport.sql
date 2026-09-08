alter table public.profiles
  add column if not exists primary_genres text[] not null default '{}'::text[],
  add column if not exists languages text[] not null default '{}'::text[],
  add column if not exists home_region text,
  add column if not exists available_for_international_bookings boolean not null default false,
  add column if not exists booking_regions text[] not null default '{}'::text[];

comment on column public.profiles.primary_genres is 'Creator-selected public genre tags used for global discovery.';
comment on column public.profiles.languages is 'Creator-selected languages used for global discovery and booking context.';
comment on column public.profiles.home_region is 'Broad public region such as Africa, Europe, Americas, Asia or MENA.';
comment on column public.profiles.available_for_international_bookings is 'Creator-controlled public international booking availability flag.';
comment on column public.profiles.booking_regions is 'Creator-selected territories/regions where bookings are welcome.';
