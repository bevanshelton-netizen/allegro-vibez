-- ALLEGRO Radio Academy: non-accredited internal skills training and talent pipeline.

create table if not exists public.radio_academy_programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  level text not null default 'foundation' check (level in ('foundation','intermediate','advanced')),
  duration_hours integer not null check (duration_hours between 1 and 1000),
  price_cents integer not null default 0 check (price_cents >= 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.radio_academy_modules (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.radio_academy_programs(id) on delete cascade,
  module_no integer not null check (module_no > 0),
  title text not null,
  learning_outcomes text[] not null default '{}',
  practical_required boolean not null default false,
  assessment_required boolean not null default true,
  created_at timestamptz not null default now(),
  unique(program_id,module_no)
);

create table if not exists public.radio_academy_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.radio_academy_programs(id) on delete restrict,
  status text not null default 'enrolled' check (status in ('enrolled','in_progress','completed','withdrawn')),
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(user_id,program_id)
);

create table if not exists public.radio_academy_practicals (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.radio_academy_enrollments(id) on delete cascade,
  practical_type text not null check (practical_type in ('studio_shift','live_show','production','sales_pitch','technical_drill','interview','compliance_log')),
  supervisor_user_id uuid references auth.users(id) on delete set null,
  scheduled_at timestamptz,
  completed_at timestamptz,
  result text check (result is null or result in ('competent','retry','not_yet_assessed')),
  feedback text,
  created_at timestamptz not null default now()
);

alter table public.radio_academy_programs enable row level security;
alter table public.radio_academy_modules enable row level security;
alter table public.radio_academy_enrollments enable row level security;
alter table public.radio_academy_practicals enable row level security;

drop policy if exists "academy programs public read" on public.radio_academy_programs;
create policy "academy programs public read" on public.radio_academy_programs
for select using (active = true);

drop policy if exists "academy modules public read" on public.radio_academy_modules;
create policy "academy modules public read" on public.radio_academy_modules
for select using (
  exists (
    select 1 from public.radio_academy_programs p
    where p.id = program_id and p.active = true
  )
);

drop policy if exists "academy users read own enrollments" on public.radio_academy_enrollments;
create policy "academy users read own enrollments" on public.radio_academy_enrollments
for select using (auth.uid() = user_id);

drop policy if exists "academy users enroll self" on public.radio_academy_enrollments;
create policy "academy users enroll self" on public.radio_academy_enrollments
for insert with check (auth.uid() = user_id);

drop policy if exists "academy users read own practicals" on public.radio_academy_practicals;
create policy "academy users read own practicals" on public.radio_academy_practicals
for select using (
  exists (
    select 1 from public.radio_academy_enrollments e
    where e.id = enrollment_id and e.user_id = auth.uid()
  )
);

insert into public.radio_academy_programs(slug,title,summary,level,duration_hours,price_cents,sort_order)
values
('radio-presenting','Radio Presenting & On-Air Performance','Voice, links, timing, audience connection, interviews and live-show discipline.','foundation',24,0,10),
('radio-production','Radio Production & Programming','Show clocks, music scheduling, jingles, features, editing, rundown construction and autopilot programming.','foundation',30,0,20),
('radio-technical','Internet Radio Technical Operations','Streaming, Icecast/Liquidsoap concepts, live ingest, monitoring, failover, audio levels and owner-node operations.','intermediate',30,0,30),
('radio-advertising','Radio Advertising & Sponsorship Sales','Prospecting, packages, rate cards, scripts, sponsorships, proof-of-play and advertiser servicing.','foundation',20,0,40),
('radio-rights','Music Rights, Compliance & Logging','Direct-rights clearance, metadata, SAMRO/SAMPRA awareness, playout evidence, advertising and POPIA basics.','foundation',16,0,50),
('radio-news-interviews','Interviewing, Newsroom & Storytelling','Research, interviewing, verification, scripting, public-interest judgment and responsible on-air storytelling.','intermediate',24,0,60),
('radio-dj-live','DJ, Live Sessions & Artist Showcases','Live sets, transitions, artist sessions, concert simulcast workflow and safe live takeover.','intermediate',24,0,70),
('radio-management','Station Management & Autopilot Operations','Programming strategy, talent management, revenue, audience analytics, incident response and 24/7 station governance.','advanced',36,0,80)
on conflict (slug) do nothing;

with p as (select id from public.radio_academy_programs where slug='radio-presenting')
insert into public.radio_academy_modules(program_id,module_no,title,learning_outcomes,practical_required)
select p.id,v.module_no,v.title,v.outcomes,v.practical from p cross join (values
(1,'Microphone, voice and presence',array['Control pace and projection','Use microphones safely','Deliver clean station links'],true),
(2,'Show clocks and timing',array['Read a clock','Hit breaks accurately','Back-time into news/ad breaks'],true),
(3,'Interviewing on air',array['Prepare questions','Listen and follow up','Handle sensitive interviews responsibly'],true),
(4,'Live-show practical',array['Present a supervised live or simulated hour','Use cues and handovers','Recover from mistakes'],true)
) as v(module_no,title,outcomes,practical)
on conflict do nothing;
