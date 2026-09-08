alter table public.profiles
  add column if not exists press_headline text,
  add column if not exists marketing_message text,
  add column if not exists booking_email text,
  add column if not exists booking_phone text,
  add column if not exists website_url text,
  add column if not exists instagram_url text,
  add column if not exists tiktok_url text,
  add column if not exists youtube_url text;

comment on column public.profiles.press_headline is 'Public creator positioning headline.';
comment on column public.profiles.marketing_message is 'Public marketing/campaign message controlled by the creator.';
comment on column public.profiles.booking_email is 'Creator-approved public booking email.';
comment on column public.profiles.booking_phone is 'Creator-approved public booking phone.';
