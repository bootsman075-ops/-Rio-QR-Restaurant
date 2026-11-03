-- RIO: staff uses password-only sessions (AAL1); managers and platform
-- administrators remain AAL2-only. The original tenant and role policies
-- are preserved; this adds a narrowly scoped staff exception to restrictive
-- RLS for operational tables. No accounts, MFA factors or data are deleted.
create function public.is_active_staff_member(p_restaurant_id uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select p_restaurant_id is not null
    and auth.uid() is not null
    and exists(
      select 1 from public.user_restaurants ur
      where ur.user_id = auth.uid()
        and ur.restaurant_id = p_restaurant_id
        and ur.role = 'staff'
        and ur.active
    );
$$;
revoke all on function public.is_active_staff_member(uuid) from public, anon;
grant execute on function public.is_active_staff_member(uuid) to authenticated;

-- AAL1 users may only read their OWN membership, to discover their role.
-- Modification of memberships continues to require AAL2 and an existing
-- permissive write policy (there is no self-service membership write).
drop policy if exists require_aal2_authenticated on public.user_restaurants;
create policy require_verified_or_own_membership
  on public.user_restaurants as restrictive for all to authenticated
  using (
    (select auth.jwt()->>'aal') = 'aal2'
    or ((select auth.jwt()->>'aal') = 'aal1' and user_id = (select auth.uid()) and active)
  )
  with check ((select auth.jwt()->>'aal') = 'aal2');

-- Operational restaurants: staff AAL1 is limited to its assigned tenant.
drop policy if exists require_aal2_authenticated on public.restaurants;
create policy require_verified_or_staff on public.restaurants
 as restrictive for all to authenticated
 using (
   (select auth.jwt()->>'aal') = 'aal2'
   or ((select auth.jwt()->>'aal') = 'aal1' and public.is_active_staff_member(id))
 )
 with check (
   (select auth.jwt()->>'aal') = 'aal2'
   or ((select auth.jwt()->>'aal') = 'aal1' and public.is_active_staff_member(id))
 );

-- Operational tables: staff AAL1 is limited to its assigned tenant.
drop policy if exists require_aal2_authenticated on public.tables;
create policy require_verified_or_staff on public.tables
 as restrictive for all to authenticated
 using (
   (select auth.jwt()->>'aal') = 'aal2'
   or ((select auth.jwt()->>'aal') = 'aal1' and public.is_active_staff_member(restaurant_id))
 )
 with check (
   (select auth.jwt()->>'aal') = 'aal2'
   or ((select auth.jwt()->>'aal') = 'aal1' and public.is_active_staff_member(restaurant_id))
 );

-- Operational reservations: staff AAL1 is limited to its assigned tenant.
drop policy if exists require_aal2_authenticated on public.reservations;
create policy require_verified_or_staff on public.reservations
 as restrictive for all to authenticated
 using (
   (select auth.jwt()->>'aal') = 'aal2'
   or ((select auth.jwt()->>'aal') = 'aal1' and public.is_active_staff_member(restaurant_id))
 )
 with check (
   (select auth.jwt()->>'aal') = 'aal2'
   or ((select auth.jwt()->>'aal') = 'aal1' and public.is_active_staff_member(restaurant_id))
 );

-- Operational service_requests: staff AAL1 is limited to its assigned tenant.
drop policy if exists require_aal2_authenticated on public.service_requests;
create policy require_verified_or_staff on public.service_requests
 as restrictive for all to authenticated
 using (
   (select auth.jwt()->>'aal') = 'aal2'
   or ((select auth.jwt()->>'aal') = 'aal1' and public.is_active_staff_member(restaurant_id))
 )
 with check (
   (select auth.jwt()->>'aal') = 'aal2'
   or ((select auth.jwt()->>'aal') = 'aal1' and public.is_active_staff_member(restaurant_id))
 );

-- Staff only reads orders for a restaurant in which it has an active
-- staff membership. Other tenant roles retain their AAL2 requirement.
drop policy if exists qr_orders_read_tenant on public.qr_orders;
create policy qr_orders_read_tenant on public.qr_orders for select to authenticated
using (
  ((select auth.jwt()->>'aal') = 'aal2'
    or ((select auth.jwt()->>'aal') = 'aal1' and public.is_active_staff_member(restaurant_id)))
  and exists (
    select 1 from public.user_restaurants ur
    where ur.user_id=(select auth.uid()) and ur.restaurant_id=qr_orders.restaurant_id and ur.active
  )
);
drop policy if exists qr_order_items_read_tenant on public.qr_order_items;
create policy qr_order_items_read_tenant on public.qr_order_items for select to authenticated
using (
  ((select auth.jwt()->>'aal') = 'aal2'
    or ((select auth.jwt()->>'aal') = 'aal1' and public.is_active_staff_member(restaurant_id)))
  and exists (
    select 1 from public.user_restaurants ur
    where ur.user_id=(select auth.uid()) and ur.restaurant_id=qr_order_items.restaurant_id and ur.active
  )
);

-- Operational order statuses can be updated by staff at AAL1.
-- Financial paid/unpaid actions remain manager-only at AAL2.
create or replace function public.update_qr_order(
  p_order_id uuid, p_action text
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_order public.qr_orders%rowtype;
  v_role public.restaurant_user_role;
  v_next text;
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  select * into v_order from public.qr_orders where id=p_order_id for update;
  if not found then raise exception 'unknown_order'; end if;
  select ur.role into v_role from public.user_restaurants ur
  where ur.user_id=auth.uid() and ur.restaurant_id=v_order.restaurant_id and ur.active limit 1;
  if not found or not (
    (v_role = 'staff' and (auth.jwt()->>'aal') in ('aal1','aal2'))
    or (v_role in ('restaurant_owner','manager') and (auth.jwt()->>'aal') = 'aal2')
  ) then raise exception 'forbidden'; end if;
  if p_action in ('mark_paid','mark_unpaid') then
    if v_role not in ('restaurant_owner','manager')
       or (auth.jwt()->>'aal') is distinct from 'aal2'
       or v_order.status='cancelled' then
      raise exception 'forbidden'; end if;
    update public.qr_orders set
      payment_status=case when p_action='mark_paid' then 'paid' else 'unpaid' end,
      paid_at=case when p_action='mark_paid' then coalesce(paid_at,now()) else null end,
      updated_at=now()
    where id=p_order_id returning * into v_order;
  else
    v_next := case
      when p_action='accept' and v_order.status='pending' then 'accepted'
      when p_action='prepare' and v_order.status='accepted' then 'preparing'
      when p_action='ready' and v_order.status='preparing' then 'ready'
      when p_action='serve' and v_order.status='ready' then 'served'
      when p_action='cancel' and v_order.status in ('pending','accepted','preparing','ready')
        and v_order.payment_status='unpaid' then 'cancelled'
      else null end;
    if v_next is null then raise exception 'invalid_order_transition'; end if;
    update public.qr_orders set status=v_next, updated_at=now()
    where id=p_order_id returning * into v_order;
  end if;
  return jsonb_build_object('id',v_order.id,'status',v_order.status,'payment_status',v_order.payment_status);
end $$;


-- Staff receives counts for its own tenant, not management finances.
create or replace function public.qr_order_report(
  p_restaurant_id uuid, p_day date
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_tz text;
  v_start timestamptz;
  v_end timestamptz;
  v_report jsonb;
  v_role public.restaurant_user_role;
begin
  if p_day is null or p_restaurant_id is null or auth.uid() is null then
    raise exception 'forbidden';
  end if;
  select ur.role into v_role from public.user_restaurants ur
  where ur.restaurant_id=p_restaurant_id and ur.user_id=auth.uid() and ur.active
  limit 1;
  if not found or not (
    (v_role = 'staff' and (auth.jwt()->>'aal') in ('aal1','aal2'))
    or (v_role in ('restaurant_owner','manager') and (auth.jwt()->>'aal')='aal2')
  ) then raise exception 'forbidden'; end if;
  select timezone into v_tz from public.restaurants where id=p_restaurant_id and is_active;
  if v_tz is null then raise exception 'unknown_restaurant'; end if;
  v_start := p_day::timestamp at time zone v_tz;
  v_end := (p_day+1)::timestamp at time zone v_tz;

  with day_orders as (
    select * from public.qr_orders
    where restaurant_id=p_restaurant_id and created_at>=v_start and created_at<v_end
  ), eligible as (
    select * from day_orders where status<>'cancelled'
  )
  select jsonb_build_object(
    'count', (select count(*) from eligible),
    'order_value_cents',(select coalesce(sum(total_cents),0) from eligible),
    'paid_value_cents',(select coalesce(sum(total_cents),0) from eligible where payment_status='paid'),
    'tables_with_orders',(select count(distinct table_id) from eligible),
    'ready_count',(select count(*) from day_orders where status='ready'),
    'pending_count',(select count(*) from day_orders where status='pending'),
    'average_cents',(select coalesce(round(avg(total_cents)),0) from eligible),
    'by_table',(
       select coalesce(jsonb_agg(jsonb_build_object(
         'table_id',z.table_id,'number',z.number,'label',z.label,
         'count',z.order_count,'total_cents',z.total_cents,'last_at',z.last_at
       ) order by z.total_cents desc),'[]'::jsonb)
       from (
         select e.table_id,t.number,t.label,count(*) order_count,
                sum(e.total_cents) total_cents,max(e.created_at) last_at
         from eligible e join public.tables t on t.id=e.table_id
         group by e.table_id,t.number,t.label order by total_cents desc limit 12
       ) z
    ),
    'top_items',(
       select coalesce(jsonb_agg(jsonb_build_object(
         'name',z.item_name,'quantity',z.qty,'total_cents',z.total
       ) order by z.qty desc),'[]'::jsonb)
       from (
         select i.item_name,sum(i.quantity) qty,sum(i.line_total_cents) total
         from public.qr_order_items i join eligible e on e.id=i.order_id
         group by i.item_name order by qty desc limit 5
       ) z
    )
  ) into v_report;
  -- Staff only sees operational counts and table labels, never management
  -- revenue totals or popular-item financial summaries, even at AAL2.
  if v_role = 'staff' then
    v_report := v_report || jsonb_build_object(
      'order_value_cents',0,
      'paid_value_cents',0,
      'average_cents',0,
      'top_items','[]'::jsonb,
      'by_table',(
        select coalesce(jsonb_agg(
          staff_row.value - 'total_cents' || jsonb_build_object('total_cents',0)
        ),'[]'::jsonb)
        from jsonb_array_elements(coalesce(v_report->'by_table','[]'::jsonb)) as staff_row(value)
      )
    );
  end if;
  return v_report;
end $$;

-- Management analytics still requires AAL2 and a management membership:
-- qr_management_analytics remains unchanged.
