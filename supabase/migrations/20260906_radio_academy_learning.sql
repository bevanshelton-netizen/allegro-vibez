-- ALLEGRO Radio Academy learner workspace, module progress and completion evidence.

create table if not exists public.radio_academy_module_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  enrollment_id uuid not null references public.radio_academy_enrollments(id) on delete cascade,
  module_id uuid not null references public.radio_academy_modules(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed')),
  started_at timestamptz,
  completed_at timestamptz,
  evidence_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,module_id)
);

create table if not exists public.radio_academy_certificates (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null unique references public.radio_academy_enrollments(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  certificate_no text not null unique,
  certificate_type text not null default 'completion' check (certificate_type in ('completion','competence')),
  issued_at timestamptz not null default now(),
  issued_by uuid references auth.users(id) on delete set null,
  notes text,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.radio_academy_module_progress enable row level security;
alter table public.radio_academy_certificates enable row level security;

drop policy if exists "academy users read own module progress" on public.radio_academy_module_progress;
create policy "academy users read own module progress"
on public.radio_academy_module_progress for select
using (auth.uid() = user_id);

drop policy if exists "academy users read own certificates" on public.radio_academy_certificates;
create policy "academy users read own certificates"
on public.radio_academy_certificates for select
using (auth.uid() = user_id);

create or replace function public.academy_mark_module_complete(p_module_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_program uuid;
  v_enrollment uuid;
  v_total integer;
  v_done integer;
  v_progress integer;
begin
  if v_user is null then
    raise exception 'authentication_required';
  end if;

  select program_id into v_program
  from radio_academy_modules
  where id = p_module_id;

  if v_program is null then
    raise exception 'module_not_found';
  end if;

  select id into v_enrollment
  from radio_academy_enrollments
  where user_id = v_user and program_id = v_program
    and status in ('enrolled','in_progress','completed');

  if v_enrollment is null then
    raise exception 'enrollment_required';
  end if;

  insert into radio_academy_module_progress(
    user_id,enrollment_id,module_id,status,started_at,completed_at,updated_at
  )
  values(v_user,v_enrollment,p_module_id,'completed',now(),now(),now())
  on conflict (user_id,module_id) do update
    set status='completed',
        started_at=coalesce(radio_academy_module_progress.started_at,now()),
        completed_at=now(),
        updated_at=now();

  select count(*) into v_total
  from radio_academy_modules where program_id = v_program;

  select count(*) into v_done
  from radio_academy_module_progress mp
  join radio_academy_modules m on m.id = mp.module_id
  where mp.user_id = v_user
    and m.program_id = v_program
    and mp.status = 'completed';

  v_progress := case when v_total = 0 then 0 else floor((v_done::numeric / v_total::numeric) * 100)::integer end;

  update radio_academy_enrollments
  set progress_percent = v_progress,
      status = case when v_progress = 100 then 'completed' else 'in_progress' end,
      completed_at = case when v_progress = 100 then coalesce(completed_at,now()) else null end
  where id = v_enrollment;

  return jsonb_build_object(
    'ok',true,
    'enrollment_id',v_enrollment,
    'completed_modules',v_done,
    'total_modules',v_total,
    'progress_percent',v_progress,
    'learning_complete',v_progress = 100,
    'certificate_pending_supervisor_review',v_progress = 100
  );
end;
$$;

revoke all on function public.academy_mark_module_complete(uuid) from public;
grant execute on function public.academy_mark_module_complete(uuid) to authenticated;

-- Seed practical, job-focused modules for all Academy pathways.
with p as (select id from public.radio_academy_programs where slug='radio-production')
insert into public.radio_academy_modules(program_id,module_no,title,learning_outcomes,practical_required)
select p.id,v.n,v.t,v.o,v.pr from p cross join (values
(1,'Building a radio clock',array['Construct a 60-minute programme clock','Place music, links, promos and adverts','Back-time fixed events'],true),
(2,'Music scheduling and rotation',array['Apply artist separation','Plan genre flow','Use rights-cleared catalogue rules'],true),
(3,'Promos, jingles and features',array['Write short promos','Structure recurring features','Maintain station identity'],true),
(4,'Autopilot programme build',array['Prepare an automated hour','Validate fallback content','Review playout evidence'],true)
) v(n,t,o,pr) on conflict do nothing;

with p as (select id from public.radio_academy_programs where slug='radio-technical')
insert into public.radio_academy_modules(program_id,module_no,title,learning_outcomes,practical_required)
select p.id,v.n,v.t,v.o,v.pr from p cross join (values
(1,'Digital audio and signal flow',array['Explain source-to-listener signal flow','Set safe audio levels','Identify clipping and silence'],true),
(2,'Streaming infrastructure',array['Explain stream origin and listener delivery','Understand Icecast/Liquidsoap roles','Protect ingest credentials'],true),
(3,'Live ingest and failover',array['Test presenter takeover','Restore autopilot safely','Use fallback audio'],true),
(4,'Monitoring and incident response',array['Detect silence','Read service health evidence','Record and escalate incidents'],true)
) v(n,t,o,pr) on conflict do nothing;

with p as (select id from public.radio_academy_programs where slug='radio-advertising')
insert into public.radio_academy_modules(program_id,module_no,title,learning_outcomes,practical_required)
select p.id,v.n,v.t,v.o,v.pr from p cross join (values
(1,'Finding and qualifying advertisers',array['Build prospect lists','Match advertisers to audiences','Prepare a needs analysis'],true),
(2,'Packages and rate cards',array['Build spot and sponsorship packages','Price inventory consistently','Protect margin'],true),
(3,'Creative and campaign workflow',array['Write an audio brief','Check required claims/disclosures','Schedule approved creative'],true),
(4,'Proof of play and renewals',array['Read proof-of-play reports','Handle under-delivery','Present renewal results'],true)
) v(n,t,o,pr) on conflict do nothing;

with p as (select id from public.radio_academy_programs where slug='radio-rights')
insert into public.radio_academy_modules(program_id,module_no,title,learning_outcomes,practical_required)
select p.id,v.n,v.t,v.o,v.pr from p cross join (values
(1,'Who owns what in a recording',array['Distinguish master and composition rights','Capture rights-holder metadata','Identify conflicts'],false),
(2,'Direct radio clearance',array['Check territory and term','Record clearance references','Block uncleared tracks'],true),
(3,'Collective licensing and logs',array['Understand SAMRO/SAMPRA roles at a practical level','Maintain playlist evidence','Escalate uncertain repertoire'],true),
(4,'Advertising, privacy and complaints',array['Recognise regulated ad risks','Apply basic POPIA principles','Record complaints/takedowns'],true)
) v(n,t,o,pr) on conflict do nothing;

with p as (select id from public.radio_academy_programs where slug='radio-news-interviews')
insert into public.radio_academy_modules(program_id,module_no,title,learning_outcomes,practical_required)
select p.id,v.n,v.t,v.o,v.pr from p cross join (values
(1,'Research and verification',array['Separate fact from allegation','Verify sources','Prepare a research brief'],true),
(2,'Writing for the ear',array['Write concise radio copy','Use plain language','Structure intros and outros'],true),
(3,'Interview craft',array['Prepare open questions','Follow up actively','Handle difficult interviews'],true),
(4,'Responsible storytelling',array['Avoid unnecessary harm','Correct mistakes','Apply fair and contextual reporting'],true)
) v(n,t,o,pr) on conflict do nothing;

with p as (select id from public.radio_academy_programs where slug='radio-dj-live')
insert into public.radio_academy_modules(program_id,module_no,title,learning_outcomes,practical_required)
select p.id,v.n,v.t,v.o,v.pr from p cross join (values
(1,'Set planning and music flow',array['Build a coherent set','Respect programme rules','Prepare cleared music'],true),
(2,'Transitions and microphone technique',array['Execute clean transitions','Use concise mic links','Recover from mistakes'],true),
(3,'Artist showcase production',array['Run a session rundown','Coordinate artist cues','Protect audio and rights evidence'],true),
(4,'Supervised live takeover',array['Authenticate live ingest','Take and return the feed safely','Complete a playout log'],true)
) v(n,t,o,pr) on conflict do nothing;

with p as (select id from public.radio_academy_programs where slug='radio-management')
insert into public.radio_academy_modules(program_id,module_no,title,learning_outcomes,practical_required)
select p.id,v.n,v.t,v.o,v.pr from p cross join (values
(1,'Station strategy and formats',array['Define target audience','Design channel proposition','Balance discovery and familiarity'],true),
(2,'People, shifts and standards',array['Build rosters','Coach presenters','Apply escalation rules'],true),
(3,'Revenue and audience analytics',array['Read campaign and listener metrics','Protect advertiser delivery','Prioritise profitable inventory'],true),
(4,'24/7 governance and incident command',array['Run an incident checklist','Approve fallback decisions','Maintain audit evidence'],true)
) v(n,t,o,pr) on conflict do nothing;
