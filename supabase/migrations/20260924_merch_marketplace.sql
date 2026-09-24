-- ALLEGRO-VIBEZ creator merchandise marketplace
-- ALLEGRO-owned stock may use owner_kind='platform'. Third-party creator stock uses owner_kind='creator'.
-- Third-party completed sales retain the fixed platform fee configured on the order.

create table if not exists public.merch_products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references auth.users(id) on delete cascade,
  owner_kind text not null default 'creator' check (owner_kind in ('creator','platform')),
  title text not null check (char_length(title) between 2 and 160),
  description text not null default '',
  product_type text not null default 'other'
    check (product_type in ('tshirt','hoodie','cap','jacket','poster','vinyl','cd','accessory','bundle','other')),
  price numeric(14,2) not null check (price >= 0),
  currency text not null default 'ZAR' check (char_length(currency)=3),
  image_url text,
  sizes text[] not null default '{}',
  colours text[] not null default '{}',
  stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),
  made_to_order boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((owner_kind='platform' and seller_id is null) or (owner_kind='creator' and seller_id is not null))
);

create table if not exists public.merch_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete restrict,
  seller_id uuid references auth.users(id) on delete restrict,
  owner_kind text not null check (owner_kind in ('creator','platform')),
  currency text not null default 'ZAR' check (char_length(currency)=3),
  subtotal numeric(14,2) not null check (subtotal >= 0),
  platform_fee_percent numeric(5,2) not null default 10 check (platform_fee_percent = 10),
  platform_fee_amount numeric(14,2) not null default 0,
  seller_net_amount numeric(14,2) not null default 0,
  shipping_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null check (total_amount >= 0),
  status text not null default 'cart'
    check (status in ('cart','payment_pending','paid','processing','shipped','delivered','cancelled','refunded')),
  payment_provider text,
  payment_reference text,
  shipping_name text,
  shipping_city text,
  shipping_country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (owner_kind='platform' and platform_fee_amount=0 and seller_net_amount=subtotal)
    or
    (owner_kind='creator' and platform_fee_amount=round(subtotal*0.10,2) and seller_net_amount=subtotal-platform_fee_amount)
  )
);

create table if not exists public.merch_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.merch_orders(id) on delete cascade,
  product_id uuid not null references public.merch_products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  selected_size text,
  selected_colour text,
  line_total numeric(14,2) not null check (line_total >= 0)
);

alter table public.merch_products enable row level security;
alter table public.merch_orders enable row level security;
alter table public.merch_order_items enable row level security;

drop policy if exists "public reads active merch" on public.merch_products;
create policy "public reads active merch" on public.merch_products
for select using (active=true or seller_id=auth.uid() or public.is_admin());

drop policy if exists "vetted creators create merch" on public.merch_products;
create policy "vetted creators create merch" on public.merch_products
for insert to authenticated
with check (
  owner_kind='creator'
  and seller_id=auth.uid()
  and public.is_marketplace_vetted(auth.uid())
);

drop policy if exists "creators manage own merch" on public.merch_products;
create policy "creators manage own merch" on public.merch_products
for update to authenticated
using (seller_id=auth.uid() or public.is_admin())
with check (seller_id=auth.uid() or public.is_admin());

drop policy if exists "buyers and sellers read merch orders" on public.merch_orders;
create policy "buyers and sellers read merch orders" on public.merch_orders
for select to authenticated
using (buyer_id=auth.uid() or seller_id=auth.uid() or public.is_admin());

drop policy if exists "buyers create merch orders" on public.merch_orders;
create policy "buyers create merch orders" on public.merch_orders
for insert to authenticated with check (buyer_id=auth.uid());

drop policy if exists "participants read merch items" on public.merch_order_items;
create policy "participants read merch items" on public.merch_order_items
for select to authenticated
using (
  exists(select 1 from public.merch_orders o where o.id=order_id and (o.buyer_id=auth.uid() or o.seller_id=auth.uid()))
  or public.is_admin()
);

create or replace function public.create_merch_order(
  p_product_id uuid,
  p_quantity integer,
  p_size text default null,
  p_colour text default null
) returns uuid
language plpgsql
security definer set search_path=public
as $$
declare
  v_product public.merch_products;
  v_order uuid;
  v_subtotal numeric(14,2);
  v_fee numeric(14,2);
  v_net numeric(14,2);
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_quantity is null or p_quantity<=0 then raise exception 'Quantity must be positive'; end if;

  select * into v_product from public.merch_products
  where id=p_product_id and active=true
  for update;
  if not found then raise exception 'Product unavailable'; end if;
  if v_product.stock_quantity is not null and v_product.stock_quantity < p_quantity then
    raise exception 'Insufficient stock';
  end if;

  v_subtotal:=round(v_product.price*p_quantity,2);
  if v_product.owner_kind='creator' then
    v_fee:=round(v_subtotal*0.10,2);
    v_net:=v_subtotal-v_fee;
  else
    v_fee:=0;
    v_net:=v_subtotal;
  end if;

  insert into public.merch_orders(
    buyer_id,seller_id,owner_kind,currency,subtotal,platform_fee_percent,
    platform_fee_amount,seller_net_amount,total_amount,status
  ) values(
    auth.uid(),v_product.seller_id,v_product.owner_kind,v_product.currency,v_subtotal,10,
    v_fee,v_net,v_subtotal,'payment_pending'
  ) returning id into v_order;

  insert into public.merch_order_items(order_id,product_id,quantity,unit_price,selected_size,selected_colour,line_total)
  values(v_order,p_product_id,p_quantity,v_product.price,p_size,p_colour,v_subtotal);

  return v_order;
end;
$$;

revoke all on function public.create_merch_order(uuid,integer,text,text) from public;
grant execute on function public.create_merch_order(uuid,integer,text,text) to authenticated;
