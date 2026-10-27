-- Strictly separate central platform administration from restaurant tenant data.
-- Platform admins use trusted server-side service operations for the central directory.
-- Restaurant tables remain accessible only to users with an active membership.

drop policy if exists tenant_restaurants_read on public.restaurants;
create policy tenant_restaurants_read
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
);

drop policy if exists tenant_tables_read on public.tables;
create policy tenant_tables_read
on public.tables
for select
to authenticated
using (
  exists (
    select 1
    from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = tables.restaurant_id
      and ur.active
  )
);

drop policy if exists tenant_tables_write on public.tables;
create policy tenant_tables_write
on public.tables
for all
to authenticated
using (
  exists (
    select 1
    from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = tables.restaurant_id
      and ur.active
      and ur.role in ('restaurant_owner', 'manager')
  )
)
with check (
  exists (
    select 1
    from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = tables.restaurant_id
      and ur.active
      and ur.role in ('restaurant_owner', 'manager')
  )
);

drop policy if exists tenant_qr_tokens_read on public.qr_tokens;
create policy tenant_qr_tokens_read
on public.qr_tokens
for select
to authenticated
using (
  exists (
    select 1
    from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = qr_tokens.restaurant_id
      and ur.active
  )
);

drop policy if exists tenant_qr_tokens_write on public.qr_tokens;
create policy tenant_qr_tokens_write
on public.qr_tokens
for all
to authenticated
using (
  exists (
    select 1
    from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = qr_tokens.restaurant_id
      and ur.active
      and ur.role in ('restaurant_owner', 'manager')
  )
)
with check (
  exists (
    select 1
    from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = qr_tokens.restaurant_id
      and ur.active
      and ur.role in ('restaurant_owner', 'manager')
  )
);

drop policy if exists tenant_menu_sections_read_all_own on public.menu_sections;
create policy tenant_menu_sections_read_all_own
on public.menu_sections
for select
to authenticated
using (
  exists (
    select 1
    from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = menu_sections.restaurant_id
      and ur.active
  )
);

drop policy if exists tenant_menu_sections_write on public.menu_sections;
create policy tenant_menu_sections_write
on public.menu_sections
for all
to authenticated
using (
  exists (
    select 1
    from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = menu_sections.restaurant_id
      and ur.active
      and ur.role in ('restaurant_owner', 'manager')
  )
)
with check (
  exists (
    select 1
    from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = menu_sections.restaurant_id
      and ur.active
      and ur.role in ('restaurant_owner', 'manager')
  )
);

drop policy if exists tenant_menu_items_read_all_own on public.menu_items;
create policy tenant_menu_items_read_all_own
on public.menu_items
for select
to authenticated
using (
  exists (
    select 1
    from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = menu_items.restaurant_id
      and ur.active
  )
);

drop policy if exists tenant_menu_items_write on public.menu_items;
create policy tenant_menu_items_write
on public.menu_items
for all
to authenticated
using (
  exists (
    select 1
    from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = menu_items.restaurant_id
      and ur.active
      and ur.role in ('restaurant_owner', 'manager')
  )
)
with check (
  exists (
    select 1
    from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = menu_items.restaurant_id
      and ur.active
      and ur.role in ('restaurant_owner', 'manager')
  )
);

drop policy if exists tenant_reservations_read on public.reservations;
create policy tenant_reservations_read
on public.reservations
for select
to authenticated
using (
  exists (
    select 1
    from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = reservations.restaurant_id
      and ur.active
  )
);

drop policy if exists tenant_reservations_insert on public.reservations;
create policy tenant_reservations_insert
on public.reservations
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = reservations.restaurant_id
      and ur.active
  )
);

drop policy if exists tenant_reservations_update on public.reservations;
create policy tenant_reservations_update
on public.reservations
for update
to authenticated
using (
  exists (
    select 1
    from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = reservations.restaurant_id
      and ur.active
  )
)
with check (
  exists (
    select 1
    from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = reservations.restaurant_id
      and ur.active
  )
);

drop policy if exists tenant_reservations_delete on public.reservations;
create policy tenant_reservations_delete
on public.reservations
for delete
to authenticated
using (
  exists (
    select 1
    from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = reservations.restaurant_id
      and ur.active
      and ur.role in ('restaurant_owner', 'manager')
  )
);

drop policy if exists tenant_service_requests_read on public.service_requests;
create policy tenant_service_requests_read
on public.service_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = service_requests.restaurant_id
      and ur.active
  )
);

drop policy if exists tenant_service_requests_update on public.service_requests;
create policy tenant_service_requests_update
on public.service_requests
for update
to authenticated
using (
  exists (
    select 1
    from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = service_requests.restaurant_id
      and ur.active
  )
)
with check (
  exists (
    select 1
    from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = service_requests.restaurant_id
      and ur.active
  )
);

drop policy if exists tenant_service_requests_delete on public.service_requests;
create policy tenant_service_requests_delete
on public.service_requests
for delete
to authenticated
using (
  exists (
    select 1
    from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = service_requests.restaurant_id
      and ur.active
      and ur.role in ('restaurant_owner', 'manager')
  )
);

drop policy if exists user_restaurants_read_own on public.user_restaurants;
create policy user_restaurants_read_own
on public.user_restaurants
for select
to authenticated
using (user_id = (select auth.uid()));
