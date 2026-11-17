-- Match password-only restaurant login in existing RPCs.
-- Preserve exact tenant membership, role checks and all business calculations.
CREATE OR REPLACE FUNCTION public.qr_management_analytics(p_restaurant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_timezone text;
  v_local_now timestamp;
  v_result jsonb;
begin
  if p_restaurant_id is null or auth.uid() is null
    or coalesce(auth.jwt()->>'aal','') not in ('aal1','aal2')
    or not exists (
      select 1 from public.user_restaurants ur
      where ur.user_id = auth.uid()
        and ur.restaurant_id = p_restaurant_id
        and ur.active
        and ur.role in ('restaurant_owner','manager')
    )
  then
    raise exception 'forbidden';
  end if;

  select r.timezone into v_timezone from public.restaurants r
  where r.id=p_restaurant_id and r.is_active;
  if v_timezone is null then raise exception 'restaurant_not_found'; end if;
  v_local_now := now() at time zone v_timezone;

  with buckets as (
    select 'day'::text as kind, gs as local_start, gs + interval '1 day' as local_end
    from generate_series(
      date_trunc('day',v_local_now)-interval '13 days',
      date_trunc('day',v_local_now),
      interval '1 day'
    ) as gs
    union all
    select 'month'::text, gs, gs + interval '1 month'
    from generate_series(
      date_trunc('month',v_local_now)-interval '11 months',
      date_trunc('month',v_local_now),
      interval '1 month'
    ) as gs
    union all
    select 'year'::text, gs, gs + interval '1 year'
    from generate_series(
      date_trunc('year',v_local_now)-interval '4 years',
      date_trunc('year',v_local_now),
      interval '1 year'
    ) as gs
  ), bounded as (
    select b.kind,b.local_start,
      b.local_start at time zone v_timezone as utc_start,
      b.local_end at time zone v_timezone as utc_end,
      case
        when b.kind='day' then to_char(b.local_start,'DD Mon')
        when b.kind='month' then to_char(b.local_start,'YYYY-MM')
        else to_char(b.local_start,'YYYY')
      end as label
    from buckets b
  ), amounts as (
    select b.kind,b.local_start,b.label,
      ordered.order_count,
      ordered.order_value_cents,
      paid.paid_value_cents
    from bounded b
    cross join lateral (
      select count(*)::integer as order_count,
        coalesce(sum(o.total_cents),0)::bigint as order_value_cents
      from public.qr_orders o
      where o.restaurant_id=p_restaurant_id
        and o.status <> 'cancelled'
        and o.created_at >= b.utc_start and o.created_at < b.utc_end
    ) ordered
    cross join lateral (
      select coalesce(sum(o.total_cents),0)::bigint as paid_value_cents
      from public.qr_orders o
      where o.restaurant_id=p_restaurant_id
        and o.status <> 'cancelled'
        and o.payment_status='paid'
        and o.paid_at >= b.utc_start and o.paid_at < b.utc_end
    ) paid
  )
  select jsonb_build_object(
    'day',coalesce(jsonb_agg(jsonb_build_object(
      'label',a.label,'period',to_char(a.local_start,'YYYY-MM-DD'),
      'orders',a.order_count,'ordered_cents',a.order_value_cents,
      'paid_cents',a.paid_value_cents
    ) order by a.local_start) filter (where a.kind='day'),'[]'::jsonb),
    'month',coalesce(jsonb_agg(jsonb_build_object(
      'label',a.label,'period',to_char(a.local_start,'YYYY-MM-DD'),
      'orders',a.order_count,'ordered_cents',a.order_value_cents,
      'paid_cents',a.paid_value_cents
    ) order by a.local_start) filter (where a.kind='month'),'[]'::jsonb),
    'year',coalesce(jsonb_agg(jsonb_build_object(
      'label',a.label,'period',to_char(a.local_start,'YYYY-MM-DD'),
      'orders',a.order_count,'ordered_cents',a.order_value_cents,
      'paid_cents',a.paid_value_cents
    ) order by a.local_start) filter (where a.kind='year'),'[]'::jsonb)
  ) into v_result
  from amounts a;

  return coalesce(v_result,'{"day":[],"month":[],"year":[]}'::jsonb);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_qr_order(p_order_id uuid, p_action text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
    or (v_role in ('restaurant_owner','manager') and (auth.jwt()->>'aal') in ('aal1','aal2'))
  ) then raise exception 'forbidden'; end if;
  if p_action in ('mark_paid','mark_unpaid') then
    if v_role not in ('restaurant_owner','manager')
       or coalesce(auth.jwt()->>'aal','') not in ('aal1','aal2')
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
end $function$
;

CREATE OR REPLACE FUNCTION public.qr_order_report(p_restaurant_id uuid, p_day date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
    or (v_role in ('restaurant_owner','manager') and (auth.jwt()->>'aal') in ('aal1','aal2'))
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
end $function$
;

CREATE OR REPLACE FUNCTION public.move_menu_section(p_restaurant_id uuid, p_section_id uuid, p_direction integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
 v_ids uuid[];
 v_len integer;
 v_index integer;
 v_target integer;
 v_tmp uuid;
 v_i integer;
begin
 if p_restaurant_id is null or p_section_id is null or p_direction not in (-1,1)
   or auth.uid() is null or coalesce(auth.jwt()->>'aal','') not in ('aal1','aal2')
   or not exists(
     select 1 from public.user_restaurants ur
     where ur.user_id=auth.uid() and ur.restaurant_id=p_restaurant_id
       and ur.active and ur.role in ('restaurant_owner','manager')
   )
 then raise exception 'forbidden'; end if;

 -- Serialize all reordering within one restaurant, avoiding concurrent
 -- updates with identical positions or lost changes.
 perform 1 from public.restaurants where id=p_restaurant_id and is_active for update;
 if not found then raise exception 'restaurant_not_found'; end if;

 select array_agg(id order by sort_order, name, id) into v_ids
 from public.menu_sections where restaurant_id=p_restaurant_id;
 if v_ids is null then raise exception 'no_categories'; end if;
 v_len := cardinality(v_ids);
 v_index := array_position(v_ids,p_section_id);
 if v_index is null then raise exception 'category_not_found'; end if;
 v_target := v_index+p_direction;
 if v_target >= 1 and v_target <= v_len then
   v_tmp := v_ids[v_target];
   v_ids[v_target] := v_ids[v_index];
   v_ids[v_index] := v_tmp;
 end if;

 for v_i in 1..v_len loop
   update public.menu_sections set sort_order=v_i
    where restaurant_id=p_restaurant_id and id=v_ids[v_i]
      and sort_order is distinct from v_i;
 end loop;
 return v_target >= 1 and v_target <= v_len;
end $function$
;
