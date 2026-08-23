-- Harden the artist release workflow before production launch.
-- Prevent status bypass, incomplete submissions, and cross-release contributor writes.

drop policy if exists "users update own releases" on public.releases;
drop policy if exists "owners update editable releases" on public.releases;
create policy "owners update editable releases"
on public.releases
for update
to authenticated
using (
  auth.uid() = owner_id
  and status in ('draft','rejected')
)
with check (
  auth.uid() = owner_id
  and status in ('draft','rejected')
);

drop policy if exists "owners insert release contributors" on public.release_contributors;
drop policy if exists "owners update release contributors" on public.release_contributors;
drop policy if exists "owners delete release contributors" on public.release_contributors;

create policy "owners insert contributors on editable releases"
on public.release_contributors
for insert
to authenticated
with check (
  auth.uid() = owner_id
  and exists (
    select 1
    from public.releases r
    where r.id = release_id
      and r.owner_id = auth.uid()
      and r.status in ('draft','rejected')
  )
);

create policy "owners update contributors on editable releases"
on public.release_contributors
for update
to authenticated
using (
  auth.uid() = owner_id
  and exists (
    select 1
    from public.releases r
    where r.id = release_id
      and r.owner_id = auth.uid()
      and r.status in ('draft','rejected')
  )
)
with check (
  auth.uid() = owner_id
  and exists (
    select 1
    from public.releases r
    where r.id = release_id
      and r.owner_id = auth.uid()
      and r.status in ('draft','rejected')
  )
);

create policy "owners delete contributors on editable releases"
on public.release_contributors
for delete
to authenticated
using (
  auth.uid() = owner_id
  and exists (
    select 1
    from public.releases r
    where r.id = release_id
      and r.owner_id = auth.uid()
      and r.status in ('draft','rejected')
  )
);

create or replace function public.submit_release(p_release_id uuid)
returns public.releases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_release public.releases;
  v_contributor_count integer;
  v_total_share numeric(7,2);
begin
  select *
  into v_release
  from public.releases
  where id = p_release_id
    and owner_id = auth.uid()
    and status in ('draft','rejected')
  for update;

  if v_release.id is null then
    raise exception 'Release cannot be submitted';
  end if;

  if v_release.audio_path is null or trim(v_release.audio_path) = '' then
    raise exception 'Upload an audio master before submission';
  end if;

  if v_release.artwork_path is null or trim(v_release.artwork_path) = '' then
    raise exception 'Upload release artwork before submission';
  end if;

  select count(*), coalesce(sum(share_percent), 0)
  into v_contributor_count, v_total_share
  from public.release_contributors
  where release_id = p_release_id
    and owner_id = auth.uid();

  if v_contributor_count = 0 then
    raise exception 'Add at least one rights contributor before submission';
  end if;

  if abs(v_total_share - 100.00) > 0.001 then
    raise exception 'Rights ownership must total exactly 100%% before submission';
  end if;

  update public.releases
  set status = 'submitted',
      submitted_at = now(),
      updated_at = now(),
      review_note = null
  where id = p_release_id
  returning * into v_release;

  insert into public.release_events (release_id, actor_id, event_type)
  values (v_release.id, auth.uid(), 'submitted');

  return v_release;
end;
$$;

revoke all on function public.submit_release(uuid) from public, anon;
grant execute on function public.submit_release(uuid) to authenticated;
