# ALLEGRO-VIBEZ Supabase Deployment Guide

## Before changing the existing project

1. Export or back up the current database first.
2. Do not paste service-role keys into `.env.local`; the web app uses only the project URL and public anon/publishable key.
3. If the existing database already contains production data, apply migrations in a staging copy first.

## Fresh project

Run, in order:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_security_workflows.sql`

## Existing ALLEGRO-VIBEZ Supabase project

Do **not** blindly run `001_initial_schema.sql` over an unknown schema. First compare the existing tables/columns with the baseline. Once the baseline entities are present, apply `002_security_workflows.sql` to add controlled submission/moderation and role hardening.

## Required buckets

- `artwork` — private, controlled signed reads; published artwork can be signed publicly.
- `music` — private masters; never public-read.
- `profiles` — private/controlled profile images in this V1 build.

## Required frontend environment

Create `.env.local` from `.env.example`:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY
```

Never add a Supabase service-role key to the frontend.
