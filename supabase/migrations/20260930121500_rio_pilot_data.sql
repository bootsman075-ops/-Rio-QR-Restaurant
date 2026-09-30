-- Pilot data: Rio, Deventer — 25 tables, each with an active QR token.
-- Idempotent: safe to run more than once.

insert into public.restaurants (slug, name, city)
values ('rio-deventer', 'Rio', 'Deventer')
on conflict (slug) do nothing;

insert into public.tables (restaurant_id, number)
select r.id, n
from public.restaurants r
cross join generate_series(1, 25) as n
where r.slug = 'rio-deventer'
on conflict (restaurant_id, number) do nothing;

insert into public.qr_tokens (restaurant_id, table_id)
select t.restaurant_id, t.id
from public.tables t
join public.restaurants r on r.id = t.restaurant_id
where r.slug = 'rio-deventer'
  and not exists (
    select 1
    from public.qr_tokens q
    where q.table_id = t.id
      and q.revoked_at is null
  );
