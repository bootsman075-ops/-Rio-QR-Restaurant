-- Publieke toegang voor gasten:
-- alleen actieve restaurants en zichtbare menukaart.
-- Tafels, QR-tokens en reserveringen blijven privé.

revoke all on table public.restaurants from anon, authenticated;
revoke all on table public.tables from anon, authenticated;
revoke all on table public.qr_tokens from anon, authenticated;
revoke all on table public.menu_sections from anon, authenticated;
revoke all on table public.menu_items from anon, authenticated;
revoke all on table public.reservations from anon, authenticated;

grant select on table public.restaurants to anon, authenticated;
grant select on table public.menu_sections to anon, authenticated;
grant select on table public.menu_items to anon, authenticated;

create policy "public_read_active_restaurants"
on public.restaurants
for select
to anon, authenticated
using (
  is_active = true
);

create policy "public_read_visible_menu_sections"
on public.menu_sections
for select
to anon, authenticated
using (
  is_visible = true
  and exists (
    select 1
    from public.restaurants r
    where r.id = menu_sections.restaurant_id
      and r.is_active = true
  )
);

create policy "public_read_visible_menu_items"
on public.menu_items
for select
to anon, authenticated
using (
  is_visible = true
  and exists (
    select 1
    from public.menu_sections s
    join public.restaurants r
      on r.id = s.restaurant_id
    where s.id = menu_items.section_id
      and s.restaurant_id = menu_items.restaurant_id
      and s.is_visible = true
      and r.is_active = true
  )
);