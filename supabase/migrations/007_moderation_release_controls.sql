-- ALLEGRO-VIBEZ v7 moderation and release-control hardening.
-- Additive migration intended to run after 001-006.

revoke update on public.releases from authenticated;
grant update (
  title, creator_name, release_type, genre, subgenre, language,
  release_date, original_release_date, artwork_path, explicit_content,
  rights_confirmed, copyright_line, phonographic_line, updated_at
) on public.releases to authenticated;

revoke update on public.tracks from authenticated;
grant update (
  title, version, primary_artist, audio_path, audio_file_name, isrc,
  duration_seconds, sample_rate, bit_depth, file_size, checksum, updated_at
) on public.tracks to authenticated;

with ranked as (
  select id, row_number() over (partition by release_id order by updated_at desc, created_at desc, id desc) as rn
  from public.moderation_cases
  where status='open'
)
update public.moderation_cases mc
set status='superseded', updated_at=now()
from ranked r
where mc.id=r.id and r.rn>1;

create unique index if not exists moderation_cases_one_open_per_release
on public.moderation_cases(release_id)
where status='open';

create or replace function public.submit_release(p_release_id uuid)
returns public.releases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_release public.releases;
begin
  select * into v_release from public.releases where id=p_release_id for update;
  if not found then raise exception 'Release not found'; end if;
  if v_release.user_id <> auth.uid() then raise exception 'Access denied'; end if;
  if v_release.status not in ('draft','changes_requested') then
    raise exception 'Release cannot be submitted from status %', v_release.status;
  end if;
  if not v_release.rights_confirmed then raise exception 'Rights declaration is required'; end if;
  if v_release.artwork_path is null then raise exception 'Artwork is required'; end if;
  if not exists (
    select 1 from public.release_tracks rt
    join public.tracks t on t.id=rt.track_id
    where rt.release_id=p_release_id and t.audio_path is not null
  ) then raise exception 'Audio is required'; end if;

  update public.releases
  set status='submitted', moderation_reason=null
  where id=p_release_id
  returning * into v_release;

  if exists(select 1 from public.moderation_cases where release_id=p_release_id and status='open') then
    update public.moderation_cases
    set decision=null, reason=null, assigned_to=null, updated_at=now()
    where release_id=p_release_id and status='open';
  else
    insert into public.moderation_cases(release_id,status) values(p_release_id,'open');
  end if;

  insert into public.audit_logs(actor_id,action,target_type,target_id,reason)
  values(auth.uid(),'release.submitted','release',p_release_id,'Artist submitted release for moderation');
  return v_release;
end;
$$;
grant execute on function public.submit_release(uuid) to authenticated;

create or replace function public.moderate_release(p_release_id uuid, p_status text, p_reason text)
returns public.releases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_release public.releases;
  v_role text;
  v_previous_status text;
  v_title text;
  v_body text;
begin
  select role into v_role from public.profiles where id=auth.uid();
  if v_role not in ('moderator','admin','super_admin') then raise exception 'Access denied'; end if;
  if p_status not in ('approved','changes_requested','rejected','published') then raise exception 'Invalid moderation status'; end if;
  if length(trim(coalesce(p_reason,''))) < 8 then raise exception 'A clear moderation reason is required'; end if;

  select * into v_release from public.releases where id=p_release_id for update;
  if not found then raise exception 'Release not found'; end if;
  v_previous_status := v_release.status;

  if p_status in ('approved','changes_requested','rejected') and v_previous_status not in ('submitted','ready','changes_requested') then
    raise exception 'Release cannot be moderated from status %', v_previous_status;
  end if;
  if p_status='published' and v_previous_status <> 'approved' then
    raise exception 'Only an approved release can be published';
  end if;

  update public.releases
  set status=p_status,
      moderation_reason=p_reason,
      published_at=case when p_status='published' then now() else published_at end
  where id=p_release_id
  returning * into v_release;

  update public.moderation_cases
  set status=case when p_status in ('approved','rejected','published') then 'closed' else 'open' end,
      decision=p_status,
      reason=p_reason,
      assigned_to=auth.uid(),
      updated_at=now()
  where release_id=p_release_id and status='open';

  insert into public.audit_logs(actor_id,action,target_type,target_id,reason,metadata)
  values(
    auth.uid(),'release.'||p_status,'release',p_release_id,p_reason,
    jsonb_build_object('previous_status',v_previous_status,'decision',p_status)
  );

  v_title := case p_status
    when 'approved' then 'Release approved'
    when 'changes_requested' then 'Changes requested for your release'
    when 'rejected' then 'Release not approved'
    when 'published' then 'Release published'
  end;
  v_body := v_release.title || ': ' || p_reason;
  insert into public.notifications(user_id,title,body,type)
  values(v_release.user_id,v_title,v_body,'moderation');

  return v_release;
end;
$$;
grant execute on function public.moderate_release(uuid,text,text) to authenticated;
