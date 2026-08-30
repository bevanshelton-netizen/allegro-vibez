create index if not exists creator_subscriptions_plan_code_idx on public.creator_subscriptions(plan_code);
create index if not exists payment_transactions_plan_code_idx on public.payment_transactions(plan_code);
create index if not exists payout_requests_owner_id_idx on public.payout_requests(owner_id);
create index if not exists release_contributors_owner_id_idx on public.release_contributors(owner_id);
create index if not exists release_events_actor_id_idx on public.release_events(actor_id);
create index if not exists release_events_release_id_idx on public.release_events(release_id);
create index if not exists releases_owner_id_idx on public.releases(owner_id);
create index if not exists royalty_ledger_owner_id_idx on public.royalty_ledger(owner_id);
create index if not exists royalty_ledger_release_id_idx on public.royalty_ledger(release_id);

revoke execute on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to service_role;

revoke execute on function public.review_release(uuid,text,text) from public, anon;
grant execute on function public.review_release(uuid,text,text) to authenticated, service_role;

revoke execute on function public.admin_update_payout(uuid,text,text,text) from public, anon;
grant execute on function public.admin_update_payout(uuid,text,text,text) to authenticated, service_role;

revoke execute on function public.request_payout(numeric,text) from public, anon;
grant execute on function public.request_payout(numeric,text) to authenticated, service_role;

revoke execute on function public.submit_release(uuid) from public, anon;
grant execute on function public.submit_release(uuid) to authenticated, service_role;
