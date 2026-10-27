drop policy if exists "public_read_active_restaurants" on public.restaurants;
create policy "public_read_active_restaurants"
on public.restaurants
for select
to anon
using (is_active = true);

drop policy if exists "tenant_restaurants_read" on public.restaurants;
create policy "tenant_restaurants_read"
on public.restaurants
for select
to authenticated
using (
  exists (
    select 1
    from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = restaurants.id
      and ur.active
  )
  or exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  )
);

drop policy if exists "public_read_visible_menu_sections" on public.menu_sections;
create policy "public_read_visible_menu_sections"
on public.menu_sections
for select
to anon
using (
  is_visible = true
  and exists (
    select 1
    from public.restaurants r
    where r.id = menu_sections.restaurant_id
      and r.is_active = true
  )
);

drop policy if exists "public_read_visible_menu_items" on public.menu_items;
create policy "public_read_visible_menu_items"
on public.menu_items
for select
to anon
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
