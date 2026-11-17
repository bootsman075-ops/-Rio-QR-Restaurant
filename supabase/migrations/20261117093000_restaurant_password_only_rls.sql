-- Restaurant accounts can use AAL1 (password) while keeping tenant RLS.
-- This intentionally changes ONLY restaurant roles: platform administrators
-- continue to require verified MFA (AAL2) for platform_admins and in code.
-- Old permissive RLS policies still enforce staff/manager permissions.
-- Reviewed alongside the complete current policy inventory, 17 Nov 2026.

create or replace function public.is_active_restaurant_member(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select p_restaurant_id is not null
    and (select auth.uid()) is not null
    and exists (
      select 1
      from public.user_restaurants ur
      where ur.user_id = (select auth.uid())
        and ur.restaurant_id = p_restaurant_id
        and ur.active = true
    );
$function$;
revoke all on function public.is_active_restaurant_member(uuid) from public;
grant execute on function public.is_active_restaurant_member(uuid) to authenticated;

-- Preserve restrictive tenant isolation, replacing an unconditional
-- AAL2 gate with an active membership check for restaurant data.
do $migration$
declare
  target_table text;
  restaurant_key text;
begin
  foreach target_table in array array[
    'restaurants',
    'tables',
    'qr_tokens',
    'menu_sections',
    'menu_items',
    'reservations',
    'service_requests'
  ] loop
    restaurant_key := case when target_table = 'restaurants' then 'id' else 'restaurant_id' end;

    execute format('drop policy if exists require_aal2_authenticated on public.%I', target_table);
    execute format('drop policy if exists require_verified_or_staff on public.%I', target_table);
    execute format('drop policy if exists require_active_restaurant_member on public.%I', target_table);
    execute format(
      'create policy require_active_restaurant_member on public.%I
       as restrictive for all to authenticated
       using (public.is_active_restaurant_member(%I))
       with check (public.is_active_restaurant_member(%I))',
      target_table, restaurant_key, restaurant_key
    );
  end loop;
end $migration$;

-- Read access to orders continues to be tenant-scoped. AAL1 staff and
-- management may read their own restaurant; never other restaurants.
drop policy if exists qr_orders_read_tenant on public.qr_orders;
create policy qr_orders_read_tenant on public.qr_orders
  for select to authenticated
  using (public.is_active_restaurant_member(restaurant_id));

drop policy if exists qr_order_items_read_tenant on public.qr_order_items;
create policy qr_order_items_read_tenant on public.qr_order_items
  for select to authenticated
  using (public.is_active_restaurant_member(restaurant_id));

-- Payment-data SELECT remains reserved for management/owners of that
-- restaurant; password-only login no longer silently hides payment settings.
drop policy if exists qr_payment_settings_management_read on public.qr_payment_settings;
create policy qr_payment_settings_management_read on public.qr_payment_settings
  for select to authenticated
  using (exists (
    select 1 from public.user_restaurants ur
    where ur.restaurant_id = qr_payment_settings.restaurant_id
      and ur.user_id = (select auth.uid())
      and ur.active = true
      and ur.role in ('manager', 'restaurant_owner')
  ));

drop policy if exists qr_payment_attempts_management_read on public.qr_payment_attempts;
create policy qr_payment_attempts_management_read on public.qr_payment_attempts
  for select to authenticated
  using (exists (
    select 1 from public.user_restaurants ur
    where ur.restaurant_id = qr_payment_attempts.restaurant_id
      and ur.user_id = (select auth.uid())
      and ur.active = true
      and ur.role in ('manager', 'restaurant_owner')
  ));

drop policy if exists qr_payment_events_management_read on public.qr_payment_events;
create policy qr_payment_events_management_read on public.qr_payment_events
  for select to authenticated
  using (exists (
    select 1 from public.user_restaurants ur
    where ur.restaurant_id = qr_payment_events.restaurant_id
      and ur.user_id = (select auth.uid())
      and ur.active = true
      and ur.role in ('manager', 'restaurant_owner')
  ));
