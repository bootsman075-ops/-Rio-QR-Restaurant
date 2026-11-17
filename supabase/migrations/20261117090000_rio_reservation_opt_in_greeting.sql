-- Rio: optional first-name greeting on the shared physical table QR.
-- No full name, phone, email, booking ID or other personal data is returned.
-- The guest must explicitly opt in when booking (false by default).
alter table public.reservations
  add column if not exists show_name_on_table_qr boolean not null default false;

create or replace function public.resolve_qr_reservation_greeting(p_token text)
returns text
language sql
stable
security definer
set search_path = ''
as $function$
  with matching_table as (
    select q.table_id, q.restaurant_id
    from public.qr_tokens q
    join public.restaurants rt on rt.id = q.restaurant_id
    join public.tables t on t.id = q.table_id and t.restaurant_id = q.restaurant_id
    where q.token = p_token
      and q.revoked_at is null
      and rt.slug = 'rio-deventer'
      and rt.is_active = true
      and t.is_active = true
    limit 1
  ),
  eligible as (
    select left(split_part(btrim(r.guest_name), ' ', 1), 30) as first_name
    from public.reservations r
    join matching_table mt
      on mt.restaurant_id = r.restaurant_id
      and mt.table_id = r.table_id
    where r.show_name_on_table_qr = true
      and r.status in ('confirmed', 'seated')
      and r.starts_at >= now() - interval '3 hours'
      and r.starts_at <= now() + interval '30 minutes'
    limit 2
  )
  select case when count(*) = 1 then min(first_name) else null end
  from eligible;
$function$;
revoke all on function public.resolve_qr_reservation_greeting(text) from public;
grant execute on function public.resolve_qr_reservation_greeting(text) to anon, authenticated;
comment on function public.resolve_qr_reservation_greeting(text)
  is 'Returns only an explicitly opted-in first name for exactly one confirmed/arrived table reservation in its active visit window.';
