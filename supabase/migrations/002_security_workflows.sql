-- ALLEGRO-VIBEZ V1 hardening and workflow functions.
-- Safe additive migration for the baseline schema in 001_initial_schema.sql.

revoke update on public.profiles from authenticated;
grant update (full_name, display_name, country, onboarding_complete, updated_at) on public.profiles to authenticated;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname='profiles_touch_updated_at') then
    create trigger profiles_touch_updated_at before update on public.profiles
    for each row execute function public.touch_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname='artist_profiles_touch_updated_at') then
    create trigger artist_profiles_touch_updated_at before update on public.artist_profiles
    for each row execute function public.touch_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname='releases_touch_updated_at') then
    create trigger releases_touch_updated_at before update on public.releases
    for each row execute function public.touch_updated_at();
  end if;
end $$;

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
  ) then
    raise exception 'Audio is required';
  end if;

  update public.releases set status='submitted', moderation_reason=null where id=p_release_id returning * into v_release;
  insert into public.moderation_cases(release_id,status) values(p_release_id,'open');
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
begin
  select role into v_role from public.profiles where id=auth.uid();
  if v_role not in ('moderator','admin','super_admin') then raise exception 'Access denied'; end if;
  if p_status not in ('approved','changes_requested','rejected','published') then raise exception 'Invalid moderation status'; end if;
  if coalesce(trim(p_reason),'')='' then raise exception 'A reason is required'; end if;

  select * into v_release from public.releases where id=p_release_id for update;
  if not found then raise exception 'Release not found'; end if;

  if p_status in ('approved','changes_requested','rejected') and v_release.status not in ('submitted','ready','changes_requested') then
    raise exception 'Release cannot be moderated from status %', v_release.status;
  end if;
  if p_status='published' and v_release.status <> 'approved' then
    raise exception 'Only an approved release can be published';
  end if;

  update public.releases
  set status=p_status,
      moderation_reason=p_reason,
      published_at=case when p_status='published' then now() else published_at end
  where id=p_release_id
  returning * into v_release;

  update public.moderation_cases
  set status=case when p_status in ('approved','rejected') then 'closed' else 'open' end,
      decision=p_status,
      reason=p_reason,
      assigned_to=auth.uid(),
      updated_at=now()
  where release_id=p_release_id and status='open';

  insert into public.audit_logs(actor_id,action,target_type,target_id,reason)
  values(auth.uid(),'release.'||p_status,'release',p_release_id,p_reason);
  return v_release;
end;
$$;
grant execute on function public.moderate_release(uuid,text,text) to authenticated;

drop policy if exists "artwork owner select" on storage.objects;
create policy "artwork controlled select" on storage.objects for select using (
  bucket_id='artwork' and (
    (storage.foldername(name))[1]=auth.uid()::text
    or public.current_role() in ('admin','super_admin','moderator')
    or exists (
      select 1 from public.releases r
      where r.id::text=(storage.foldername(name))[2]
        and r.status='published'
    )
  )
);
