-- ALLEGRO-VIBEZ v6: launch hardening, copyright operations, risk controls and operational telemetry

create table if not exists public.operational_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  severity text not null default 'info' check (severity in ('info','warning','error','critical')),
  route text,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.operational_events enable row level security;

drop policy if exists "staff operational events read" on public.operational_events;
create policy "staff operational events read" on public.operational_events
for select to authenticated using (public.is_staff());

drop policy if exists "authenticated operational events insert" on public.operational_events;
create policy "authenticated operational events insert" on public.operational_events
for insert to authenticated with check (actor_id = auth.uid() or actor_id is null);

create or replace function public.create_copyright_case(
  p_release_id uuid,
  p_track_id uuid,
  p_claim_type text,
  p_statement text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if length(trim(coalesce(p_statement,''))) < 20 then
    raise exception 'A detailed statement of at least 20 characters is required';
  end if;
  if p_claim_type not in ('ownership','licence','plagiarism','unauthorised_use','takedown','other') then
    raise exception 'Unsupported copyright claim type';
  end if;

  insert into public.copyright_cases(claimant_user_id,release_id,track_id,claim_type,statement,status)
  values(auth.uid(),p_release_id,p_track_id,p_claim_type,trim(p_statement),'open')
  returning id into v_case_id;

  insert into public.audit_logs(actor_id,action,target_type,target_id,reason,metadata)
  values(auth.uid(),'copyright_case_created','copyright_case',v_case_id,'Copyright case submitted',
    jsonb_build_object('release_id',p_release_id,'track_id',p_track_id,'claim_type',p_claim_type));

  return v_case_id;
end;
$$;

revoke all on function public.create_copyright_case(uuid,uuid,text,text) from public;
grant execute on function public.create_copyright_case(uuid,uuid,text,text) to authenticated;

create or replace function public.resolve_copyright_case(
  p_case_id uuid,
  p_status text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select role into v_role from public.profiles where id=auth.uid();
  if v_role not in ('moderator','admin','super_admin') then
    raise exception 'Moderator access required';
  end if;
  if p_status not in ('reviewing','changes_requested','resolved','rejected') then
    raise exception 'Unsupported case status';
  end if;
  if length(trim(coalesce(p_reason,''))) < 5 then
    raise exception 'A reason is required';
  end if;

  update public.copyright_cases
  set status=p_status, assigned_to=coalesce(assigned_to,auth.uid()), updated_at=now()
  where id=p_case_id;

  if not found then raise exception 'Copyright case not found'; end if;

  insert into public.audit_logs(actor_id,action,target_type,target_id,reason,metadata)
  values(auth.uid(),'copyright_case_'||p_status,'copyright_case',p_case_id,trim(p_reason),
    jsonb_build_object('status',p_status));
end;
$$;

revoke all on function public.resolve_copyright_case(uuid,text,text) from public;
grant execute on function public.resolve_copyright_case(uuid,text,text) to authenticated;

create or replace function public.review_risk_flag(
  p_flag_id uuid,
  p_status text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select role into v_role from public.profiles where id=auth.uid();
  if v_role not in ('moderator','admin','super_admin') then
    raise exception 'Moderator access required';
  end if;
  if p_status not in ('reviewing','cleared','confirmed') then
    raise exception 'Unsupported risk status';
  end if;
  if length(trim(coalesce(p_reason,''))) < 5 then
    raise exception 'A reason is required';
  end if;

  update public.risk_flags
  set status=p_status, resolved_at=case when p_status in ('cleared','confirmed') then now() else null end
  where id=p_flag_id;
  if not found then raise exception 'Risk flag not found'; end if;

  insert into public.audit_logs(actor_id,action,target_type,target_id,reason,metadata)
  values(auth.uid(),'risk_flag_'||p_status,'risk_flag',p_flag_id,trim(p_reason),
    jsonb_build_object('status',p_status));
end;
$$;

revoke all on function public.review_risk_flag(uuid,text,text) from public;
grant execute on function public.review_risk_flag(uuid,text,text) to authenticated;

create index if not exists operational_events_severity_created_idx on public.operational_events(severity,created_at desc);
create index if not exists copyright_cases_assigned_status_idx on public.copyright_cases(assigned_to,status);
