-- ALLEGRO-VIBEZ DROP 01 reservation conversion hardening
-- One reservation may create at most one merch order record.

alter table public.allegro_merch_orders
  add column if not exists reservation_ref text;

create unique index if not exists allegro_merch_orders_reservation_ref_unique
  on public.allegro_merch_orders (reservation_ref)
  where reservation_ref is not null;

comment on column public.allegro_merch_orders.reservation_ref is
'Optional DROP 01 reservation converted into this order. Unique when present to prevent duplicate order creation for one reservation.';
