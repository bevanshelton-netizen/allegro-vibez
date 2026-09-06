-- ALLEGRO Radio Academy theory tests + supervised practical assessment gates.

alter table public.radio_academy_programs
  add column if not exists theory_pass_percent integer not null default 70
  check (theory_pass_percent between 1 and 100);

alter table public.radio_academy_practicals
  add column if not exists requirement_id uuid,
  add column if not exists assessor_notes jsonb not null default '{}'::jsonb;

create table if not exists public.radio_academy_questions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.radio_academy_programs(id) on delete cascade,
  module_id uuid references public.radio_academy_modules(id) on delete set null,
  prompt text not null,
  options jsonb not null check (jsonb_typeof(options)='array' and jsonb_array_length(options) between 2 and 6),
  correct_option integer not null check (correct_option between 0 and 5),
  explanation text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.radio_academy_theory_attempts (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.radio_academy_enrollments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.radio_academy_programs(id) on delete restrict,
  question_ids uuid[] not null,
  answers jsonb not null default '{}'::jsonb,
  question_count integer not null check (question_count > 0),
  correct_count integer,
  score_percent integer check (score_percent between 0 and 100),
  pass_mark integer not null check (pass_mark between 1 and 100),
  passed boolean,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.radio_academy_practical_requirements (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.radio_academy_programs(id) on delete cascade,
  practical_type text not null,
  title text not null,
  description text not null,
  rubric jsonb not null check (jsonb_typeof(rubric)='array' and jsonb_array_length(rubric) > 0),
  required boolean not null default true,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(program_id, practical_type, title)
);

alter table public.radio_academy_practicals
  drop constraint if exists radio_academy_practicals_requirement_id_fkey;
alter table public.radio_academy_practicals
  add constraint radio_academy_practicals_requirement_id_fkey
  foreign key (requirement_id) references public.radio_academy_practical_requirements(id) on delete set null;

create table if not exists public.radio_academy_supervisors (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default true,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.radio_academy_questions enable row level security;
alter table public.radio_academy_theory_attempts enable row level security;
alter table public.radio_academy_practical_requirements enable row level security;
alter table public.radio_academy_supervisors enable row level security;

-- Learners must never receive correct answers directly from the question table.
-- No SELECT policy is created on radio_academy_questions.

drop policy if exists "academy users read own theory attempts" on public.radio_academy_theory_attempts;
create policy "academy users read own theory attempts"
on public.radio_academy_theory_attempts for select
using (auth.uid() = user_id);

drop policy if exists "academy practical requirements public read" on public.radio_academy_practical_requirements;
create policy "academy practical requirements public read"
on public.radio_academy_practical_requirements for select
using (active = true);

drop policy if exists "academy supervisors read own supervisor row" on public.radio_academy_supervisors;
create policy "academy supervisors read own supervisor row"
on public.radio_academy_supervisors for select
using (auth.uid() = user_id);

create or replace function public.academy_start_theory_test(p_enrollment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid := auth.uid();
  v_program uuid;
  v_pass integer;
  v_ids uuid[];
  v_attempt uuid;
  v_questions jsonb;
begin
  if v_user is null then raise exception 'authentication_required'; end if;

  select e.program_id, p.theory_pass_percent
    into v_program, v_pass
  from radio_academy_enrollments e
  join radio_academy_programs p on p.id=e.program_id
  where e.id=p_enrollment_id and e.user_id=v_user;

  if v_program is null then raise exception 'enrollment_not_found'; end if;

  select array_agg(id)
    into v_ids
  from (
    select id from radio_academy_questions
    where program_id=v_program and active=true
    order by random()
    limit 10
  ) q;

  if coalesce(array_length(v_ids,1),0) < 4 then
    raise exception 'insufficient_question_bank';
  end if;

  insert into radio_academy_theory_attempts(
    enrollment_id,user_id,program_id,question_ids,question_count,pass_mark
  )
  values(
    p_enrollment_id,v_user,v_program,v_ids,array_length(v_ids,1),v_pass
  )
  returning id into v_attempt;

  select jsonb_agg(
    jsonb_build_object(
      'id',q.id,
      'prompt',q.prompt,
      'options',q.options
    )
  )
  into v_questions
  from radio_academy_questions q
  where q.id=any(v_ids);

  return jsonb_build_object(
    'ok',true,
    'attempt_id',v_attempt,
    'pass_mark',v_pass,
    'questions',v_questions
  );
end;
$$;

create or replace function public.academy_submit_theory_test(p_attempt_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid := auth.uid();
  v_attempt radio_academy_theory_attempts%rowtype;
  v_correct integer := 0;
  v_score integer;
  v_passed boolean;
  v_question uuid;
  v_selected integer;
  v_answered integer := 0;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if jsonb_typeof(p_answers) <> 'object' then raise exception 'answers_must_be_object'; end if;

  select * into v_attempt
  from radio_academy_theory_attempts
  where id=p_attempt_id and user_id=v_user
  for update;

  if v_attempt.id is null then raise exception 'attempt_not_found'; end if;
  if v_attempt.submitted_at is not null then raise exception 'attempt_already_submitted'; end if;

  foreach v_question in array v_attempt.question_ids loop
    if p_answers ? v_question::text then
      v_answered := v_answered + 1;
      v_selected := (p_answers ->> v_question::text)::integer;
      if exists(
        select 1 from radio_academy_questions
        where id=v_question and correct_option=v_selected and active=true
      ) then
        v_correct := v_correct + 1;
      end if;
    end if;
  end loop;

  if v_answered <> v_attempt.question_count then
    raise exception 'all_questions_must_be_answered';
  end if;

  v_score := round((v_correct::numeric / v_attempt.question_count::numeric) * 100)::integer;
  v_passed := v_score >= v_attempt.pass_mark;

  update radio_academy_theory_attempts
  set answers=p_answers,
      correct_count=v_correct,
      score_percent=v_score,
      passed=v_passed,
      submitted_at=now()
  where id=p_attempt_id;

  return jsonb_build_object(
    'ok',true,
    'score_percent',v_score,
    'correct_count',v_correct,
    'question_count',v_attempt.question_count,
    'pass_mark',v_attempt.pass_mark,
    'passed',v_passed
  );
end;
$$;

create or replace function public.academy_completion_status(p_enrollment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid := auth.uid();
  v_program uuid;
  v_learning integer;
  v_theory boolean;
  v_required integer;
  v_practical integer;
  v_complete boolean;
begin
  if v_user is null then raise exception 'authentication_required'; end if;

  select program_id,progress_percent into v_program,v_learning
  from radio_academy_enrollments
  where id=p_enrollment_id and user_id=v_user;

  if v_program is null then raise exception 'enrollment_not_found'; end if;

  select coalesce(bool_or(passed),false) into v_theory
  from radio_academy_theory_attempts
  where enrollment_id=p_enrollment_id and submitted_at is not null;

  select count(*) into v_required
  from radio_academy_practical_requirements
  where program_id=v_program and required=true and active=true;

  select count(distinct requirement_id) into v_practical
  from radio_academy_practicals
  where enrollment_id=p_enrollment_id
    and result='competent'
    and requirement_id is not null;

  v_complete := v_learning=100 and v_theory and v_practical>=v_required and v_required>0;

  return jsonb_build_object(
    'ok',true,
    'learning_percent',v_learning,
    'theory_passed',v_theory,
    'required_practicals',v_required,
    'competent_practicals',v_practical,
    'programme_complete',v_complete
  );
end;
$$;

create or replace function public.academy_assess_practical(
  p_practical_id uuid,
  p_scores jsonb,
  p_feedback text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid := auth.uid();
  v_req uuid;
  v_rubric jsonb;
  v_item jsonb;
  v_key text;
  v_all boolean := true;
  v_result text;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if not exists(select 1 from radio_academy_supervisors where user_id=v_user and active=true) then
    raise exception 'supervisor_required';
  end if;

  select requirement_id into v_req
  from radio_academy_practicals
  where id=p_practical_id
  for update;

  if v_req is null then raise exception 'practical_requirement_missing'; end if;

  select rubric into v_rubric
  from radio_academy_practical_requirements
  where id=v_req and active=true;

  for v_item in select * from jsonb_array_elements(v_rubric) loop
    v_key := v_item ->> 'key';
    if coalesce((p_scores ->> v_key)::boolean,false) is not true then
      v_all := false;
    end if;
  end loop;

  v_result := case when v_all then 'competent' else 'retry' end;

  update radio_academy_practicals
  set supervisor_user_id=v_user,
      completed_at=now(),
      result=v_result,
      feedback=left(coalesce(p_feedback,''),4000),
      assessor_notes=p_scores
  where id=p_practical_id;

  return jsonb_build_object('ok',true,'result',v_result);
end;
$$;

revoke all on function public.academy_start_theory_test(uuid) from public;
revoke all on function public.academy_submit_theory_test(uuid,jsonb) from public;
revoke all on function public.academy_completion_status(uuid) from public;
revoke all on function public.academy_assess_practical(uuid,jsonb,text) from public;
grant execute on function public.academy_start_theory_test(uuid) to authenticated;
grant execute on function public.academy_submit_theory_test(uuid,jsonb) to authenticated;
grant execute on function public.academy_completion_status(uuid) to authenticated;
grant execute on function public.academy_assess_practical(uuid,jsonb,text) to authenticated;

-- Practical requirements. Every pathway requires at least one supervised competence gate.
with p as (select id from radio_academy_programs where slug='radio-presenting')
insert into radio_academy_practical_requirements(program_id,practical_type,title,description,rubric,sort_order)
select p.id,'live_show','Supervised 30-minute presenter shift','Present a supervised programme segment using a clock, links, cues and recovery skills.',
'[{"key":"timing","label":"Hits required timing/cues"},{"key":"mic","label":"Clear microphone technique"},{"key":"content","label":"Links are accurate and appropriate"},{"key":"recovery","label":"Recovers safely from mistakes"}]'::jsonb,10 from p
on conflict do nothing;

with p as (select id from radio_academy_programs where slug='radio-production')
insert into radio_academy_practical_requirements(program_id,practical_type,title,description,rubric,sort_order)
select p.id,'production','Build a broadcast-ready hour','Create a 60-minute programme clock with cleared music, breaks, IDs and fallback.',
'[{"key":"clock","label":"Clock totals and back-timing are correct"},{"key":"rights","label":"Only cleared music is used"},{"key":"flow","label":"Programme flow is coherent"},{"key":"fallback","label":"Fallback and fixed events are prepared"}]'::jsonb,10 from p
on conflict do nothing;

with p as (select id from radio_academy_programs where slug='radio-technical')
insert into radio_academy_practical_requirements(program_id,practical_type,title,description,rubric,sort_order)
select p.id,'technical_drill','Live ingest and failover drill','Take a live feed, identify a failure and restore autopilot without losing station continuity.',
'[{"key":"auth","label":"Uses secure ingest authentication"},{"key":"levels","label":"Maintains safe audio levels"},{"key":"failover","label":"Restores fallback/autopilot correctly"},{"key":"log","label":"Records incident evidence"}]'::jsonb,10 from p
on conflict do nothing;

with p as (select id from radio_academy_programs where slug='radio-advertising')
insert into radio_academy_practical_requirements(program_id,practical_type,title,description,rubric,sort_order)
select p.id,'sales_pitch','Advertiser sales pitch','Prepare and deliver a compliant ALLEGRO Radio campaign proposal.',
'[{"key":"needs","label":"Identifies advertiser need"},{"key":"package","label":"Proposes suitable inventory"},{"key":"pricing","label":"Explains pricing and delivery clearly"},{"key":"compliance","label":"Flags regulated claims/creative risks"}]'::jsonb,10 from p
on conflict do nothing;

with p as (select id from radio_academy_programs where slug='radio-rights')
insert into radio_academy_practical_requirements(program_id,practical_type,title,description,rubric,sort_order)
select p.id,'compliance_log','Rights and playout audit','Audit a sample programme for rights clearance and playout evidence.',
'[{"key":"ownership","label":"Identifies master/composition rights"},{"key":"clearance","label":"Checks clearance reference and territory"},{"key":"logs","label":"Produces complete playout evidence"},{"key":"escalation","label":"Blocks/escalates uncertain repertoire"}]'::jsonb,10 from p
on conflict do nothing;

with p as (select id from radio_academy_programs where slug='radio-news-interviews')
insert into radio_academy_practical_requirements(program_id,practical_type,title,description,rubric,sort_order)
select p.id,'interview','Recorded or live interview practical','Research, conduct and close a responsible interview.',
'[{"key":"research","label":"Research is verified and relevant"},{"key":"questions","label":"Questions are clear and open"},{"key":"listening","label":"Uses appropriate follow-ups"},{"key":"fairness","label":"Maintains fairness and responsible treatment"}]'::jsonb,10 from p
on conflict do nothing;

with p as (select id from radio_academy_programs where slug='radio-dj-live')
insert into radio_academy_practical_requirements(program_id,practical_type,title,description,rubric,sort_order)
select p.id,'live_show','Supervised DJ/live takeover','Run a supervised live set and return control to autopilot safely.',
'[{"key":"set","label":"Set is prepared and rights-cleared"},{"key":"transitions","label":"Transitions are controlled"},{"key":"mic","label":"Mic links are concise and suitable"},{"key":"handover","label":"Returns feed to autopilot safely"}]'::jsonb,10 from p
on conflict do nothing;

with p as (select id from radio_academy_programs where slug='radio-management')
insert into radio_academy_practical_requirements(program_id,practical_type,title,description,rubric,sort_order)
select p.id,'technical_drill','Station manager incident simulation','Lead a simulated programming/revenue/technical incident using an evidence-based response.',
'[{"key":"triage","label":"Prioritises listener/safety/continuity risks"},{"key":"decision","label":"Makes a clear operational decision"},{"key":"communication","label":"Communicates roles and escalation"},{"key":"evidence","label":"Maintains an auditable incident record"}]'::jsonb,10 from p
on conflict do nothing;

-- Theory question bank: four questions per pathway, enough for a first secure attempt.
with p as (select id from radio_academy_programs where slug='radio-presenting')
insert into radio_academy_questions(program_id,prompt,options,correct_option,explanation)
select p.id,v.prompt,v.options::jsonb,v.correct,v.explain from p cross join (values
('Why is back-timing used in a live radio show?','["To make the show louder","To reach a fixed event at the correct time","To change the music genre","To increase advertising prices"]',1,'Back-timing helps the presenter/producer arrive at a fixed break or event on time.'),
('What is the best response to a minor on-air mistake?','["Stop the stream","Argue with the producer","Recover briefly and continue professionally","Ignore all future cues"]',2,'Professional recovery protects continuity and listener trust.'),
('Which microphone habit is safest?','["Shouting directly into it","Keeping consistent distance and level","Tapping it repeatedly","Sharing passwords on air"]',1,'Consistent technique gives stable, clean audio.'),
('A strong interview question is usually…','["Open and relevant","Designed only for yes/no answers","Unrelated to the guest","A hidden advertisement"]',0,'Open, relevant questions encourage useful answers.')
) v(prompt,options,correct,explain);

with p as (select id from radio_academy_programs where slug='radio-production')
insert into radio_academy_questions(program_id,prompt,options,correct_option,explanation)
select p.id,v.prompt,v.options::jsonb,v.correct,v.explain from p cross join (values
('What is a radio clock?','["A wall clock only","A timed structure for an hour/programme","A listener invoice","A music licence"]',1,'A radio clock allocates programme elements across time.'),
('Why use artist separation?','["To prevent excessive repetition","To remove all African music","To avoid adverts","To increase file size"]',0,'Separation improves rotation quality.'),
('What should autopilot play if a track has no rights clearance?','["Play it quietly","Play it only at night","Do not schedule it","Rename the artist"]',2,'Uncleared tracks must be blocked.'),
('A station ident is useful because it…','["Replaces all music","Provides branding/fallback continuity","Cancels licences","Disables monitoring"]',1,'Station IDs support identity and can provide safe fallback audio.')
) v(prompt,options,correct,explain);

with p as (select id from radio_academy_programs where slug='radio-technical')
insert into radio_academy_questions(program_id,prompt,options,correct_option,explanation)
select p.id,v.prompt,v.options::jsonb,v.correct,v.explain from p cross join (values
('What is the stream origin?','["The source server distributing the station stream","A radio presenter","An advertiser invoice","A music genre"]',0,'The origin serves the encoded station stream to listeners/relays.'),
('Why must live ingest credentials be protected?','["To prevent unauthorised people taking over the feed","To improve song lyrics","To avoid using headphones","To increase bitrate"]',0,'Ingest credentials control who can broadcast into the station.'),
('What should happen when the live presenter feed fails?','["Permanent silence","Automatic fallback/autopilot","Delete the catalogue","Expose passwords"]',1,'Failover keeps the station continuous.'),
('Clipping usually means…','["The audio level exceeded available headroom","The listener logged out","A licence expired","The schedule is empty"]',0,'Clipping is audio distortion from excessive level.')
) v(prompt,options,correct,explain);

with p as (select id from radio_academy_programs where slug='radio-advertising')
insert into radio_academy_questions(program_id,prompt,options,correct_option,explanation)
select p.id,v.prompt,v.options::jsonb,v.correct,v.explain from p cross join (values
('Proof-of-play is primarily used to…','["Show when agreed advertising was delivered","Hide campaign data","Replace contracts","Choose presenters"]',0,'Proof-of-play supports campaign reporting and billing evidence.'),
('A good advertising proposal starts with…','["Understanding the advertiser objective","Promising impossible results","Ignoring the audience","Removing campaign dates"]',0,'Needs analysis comes before inventory recommendations.'),
('Regulated advertising claims should be…','["Accepted without review","Flagged for required legal/compliance checks","Broadcast secretly","Removed from all records"]',1,'Regulated sectors often require additional disclosures/approvals.'),
('A make-good is generally…','["Replacement delivery for confirmed under-delivery","A music royalty","A presenter salary","A listener password"]',0,'Make-goods compensate for missed contracted inventory.')
) v(prompt,options,correct,explain);

with p as (select id from radio_academy_programs where slug='radio-rights')
insert into radio_academy_questions(program_id,prompt,options,correct_option,explanation)
select p.id,v.prompt,v.options::jsonb,v.correct,v.explain from p cross join (values
('The master right generally relates to…','["The sound recording","Only the song title","A radio advert","The studio building"]',0,'The master is the actual recorded performance/sound recording.'),
('If rights territory is ZA only, autopilot should…','["Treat it as worldwide","Use it only in the allowed territory/feed","Ignore the restriction","Delete the metadata"]',1,'Territory limits must be enforced.'),
('A clearance reference should be…','["A traceable record of permission/licence","A random nickname","A listener comment","An audio bitrate"]',0,'Clearance must be evidenced and auditable.'),
('When repertoire rights are uncertain, the safest action is…','["Broadcast first","Block/escalate before broadcast","Hide the artist name","Change the genre"]',1,'Uncertain rights should be resolved before use.')
) v(prompt,options,correct,explain);

with p as (select id from radio_academy_programs where slug='radio-news-interviews')
insert into radio_academy_questions(program_id,prompt,options,correct_option,explanation)
select p.id,v.prompt,v.options::jsonb,v.correct,v.explain from p cross join (values
('Before stating an allegation as fact, a presenter should…','["Verify it adequately","Repeat it louder","Ask an advertiser","Delete the script"]',0,'Verification is a basic editorial safeguard.'),
('Radio copy is usually strongest when it is…','["Clear and written for the ear","Full of unnecessary jargon","As long as possible","Unrelated to the story"]',0,'Listeners cannot reread broadcast copy.'),
('A useful follow-up question is based on…','["What the guest actually said","A random topic","The station password","An ad rate"]',0,'Active listening improves interviews.'),
('If an important factual error is broadcast, the station should…','["Correct it appropriately","Pretend it never happened","Delete all logs","Blame a listener"]',0,'Responsible broadcasting includes correction.')
) v(prompt,options,correct,explain);

with p as (select id from radio_academy_programs where slug='radio-dj-live')
insert into radio_academy_questions(program_id,prompt,options,correct_option,explanation)
select p.id,v.prompt,v.options::jsonb,v.correct,v.explain from p cross join (values
('Before a live DJ set, music should be…','["Rights-cleared for the intended use","Copied from any consumer app","Unlabelled","Uploaded without metadata"]',0,'The live set remains subject to music rights controls.'),
('A safe handover after a live set means…','["Returning control to autopilot/fallback cleanly","Stopping all services","Publishing the ingest password","Removing monitoring"]',0,'A controlled handover protects continuity.'),
('Good transitions should primarily…','["Support musical/programme flow","Cause clipping","Ignore timing","Replace all station IDs"]',0,'Transitions should sound intentional and stay within technical limits.'),
('The live ingest password should be…','["Kept private to authorised users","Read aloud on air","Posted publicly","Used as the station name"]',0,'It protects the broadcast source.')
) v(prompt,options,correct,explain);

with p as (select id from radio_academy_programs where slug='radio-management')
insert into radio_academy_questions(program_id,prompt,options,correct_option,explanation)
select p.id,v.prompt,v.options::jsonb,v.correct,v.explain from p cross join (values
('During a station incident, the first management priority is…','["Protect continuity/safety and establish facts","Increase ad prices","Delete logs","Change the logo"]',0,'Incident triage must focus on impact and reliable information.'),
('Why retain incident evidence?','["For audit, learning and accountability","To make the server slower","To replace music rights","To avoid communication"]',0,'Evidence supports improvement and defensible decisions.'),
('A programme format should be designed around…','["A defined audience and proposition","Random scheduling only","One advertiser","The server password"]',0,'A clear audience proposition guides programming.'),
('Healthy station revenue management should…','["Balance advertiser delivery with audience trust","Play adverts continuously","Hide proof-of-play","Ignore campaign obligations"]',0,'Long-term value requires both audience and advertiser outcomes.')
) v(prompt,options,correct,explain);
