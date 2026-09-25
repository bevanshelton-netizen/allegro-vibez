-- ALLEGRO-VIBEZ merch hardening and official-store administration
-- Keeps creator commerce server-enforced and allows trusted admins to seed official platform stock.

drop policy if exists "buyers create merch orders" on public.merch_orders;

drop policy if exists "admins create official merch" on public.merch_products;
create policy "admins create official merch" on public.merch_products
for insert to authenticated
with check (
  owner_kind='platform'
  and seller_id is null
  and public.is_admin()
);

drop policy if exists "admins delete merch" on public.merch_products;
create policy "admins delete merch" on public.merch_products
for delete to authenticated
using (public.is_admin());

comment on table public.merch_orders is
'ALLEGRO merch orders. Client-side direct inserts are blocked; authenticated buyers create orders through create_merch_order so creator marketplace fees remain server-calculated.';
