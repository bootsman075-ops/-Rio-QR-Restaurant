-- RIO QR ordering, additive migration. No existing tenant data is updated.
-- Payments are MANUALLY marked by management; this migration never charges a guest.
create table public.qr_orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id),
  table_id uuid not null,
  qr_token_id uuid not null references public.qr_tokens(id),
  client_request_id uuid not null,
  status text not null default 'pending'
    check (status in ('pending','accepted','preparing','ready','served','cancelled')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','paid')),
  total_cents integer not null check (total_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  unique (restaurant_id, id),
  unique (restaurant_id, table_id, client_request_id),
  foreign key (restaurant_id, table_id) references public.tables(restaurant_id,id)
);
create index qr_orders_restaurant_date_idx on public.qr_orders(restaurant_id, created_at desc);
create index qr_orders_restaurant_status_idx on public.qr_orders(restaurant_id,status,created_at desc);

create table public.qr_order_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  order_id uuid not null,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  item_name text not null,
  quantity integer not null check(quantity between 1 and 20),
  unit_price_cents integer not null check(unit_price_cents between 0 and 10000000),
  line_total_cents integer generated always as (quantity * unit_price_cents) stored,
  foreign key (restaurant_id,order_id) references public.qr_orders(restaurant_id,id)
);
create index qr_order_items_order_idx on public.qr_order_items(order_id);

alter table public.qr_orders enable row level security;
alter table public.qr_order_items enable row level security;
revoke all on public.qr_orders, public.qr_order_items from public, anon, authenticated;
grant select on public.qr_orders, public.qr_order_items to authenticated;

create policy qr_orders_read_tenant on public.qr_orders for select to authenticated using (
  (select auth.jwt()->>'aal') = 'aal2' and exists (
    select 1 from public.user_restaurants ur
    where ur.user_id=(select auth.uid()) and ur.restaurant_id=qr_orders.restaurant_id and ur.active
  )
);
create policy qr_order_items_read_tenant on public.qr_order_items for select to authenticated using (
  (select auth.jwt()->>'aal') = 'aal2' and exists (
    select 1 from public.user_restaurants ur
    where ur.user_id=(select auth.uid()) and ur.restaurant_id=qr_order_items.restaurant_id and ur.active
  )
);

-- Guest can create ONE order per idempotency key, using a CURRENT QR token.
-- Price and table always come from the database, never the request JSON.
create function public.create_qr_order(
  p_token text, p_client_request_id uuid, p_items jsonb
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_restaurant uuid;
  v_table uuid;
  v_token_id uuid;
  v_entry jsonb;
  v_item_id uuid;
  v_qty integer;
  v_menu record;
  v_snapshots jsonb := '[]'::jsonb;
  v_total bigint := 0;
  v_existing public.qr_orders%rowtype;
  v_order_id uuid;
  v_snapshot jsonb;
begin
  if p_token is null or length(p_token) not between 16 and 128 or p_client_request_id is null
    or p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'invalid_order_input';
  end if;
  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 30 then
    raise exception 'invalid_order_items';
  end if;
  select q.restaurant_id, q.table_id, q.id into v_restaurant,v_table,v_token_id
  from public.qr_tokens q
  join public.tables t on t.id=q.table_id and t.restaurant_id=q.restaurant_id and t.is_active
  join public.restaurants r on r.id=q.restaurant_id and r.is_active
  where q.token=p_token and q.revoked_at is null
  limit 1;
  if v_table is null then raise exception 'invalid_qr_token'; end if;

  select * into v_existing from public.qr_orders
  where restaurant_id=v_restaurant and table_id=v_table and client_request_id=p_client_request_id;
  if found then
    return jsonb_build_object('id',v_existing.id,'total_cents',v_existing.total_cents,'status',v_existing.status);
  end if;
  if (select count(*) from public.qr_orders
      where restaurant_id=v_restaurant and table_id=v_table
        and created_at > now() - interval '1 minute') >= 6 then
    raise exception 'order_rate_limit';
  end if;

  for v_entry in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_entry) <> 'object'
      or jsonb_typeof(v_entry->'id') <> 'string'
      or jsonb_typeof(v_entry->'quantity') <> 'number'
      or coalesce(v_entry->>'id','') !~ '^[0-9a-fA-F-]{36}$'
      or coalesce(v_entry->>'quantity','') !~ '^[0-9]{1,2}$' then
      raise exception 'invalid_order_item';
    end if;
    v_item_id := (v_entry->>'id')::uuid;
    v_qty := (v_entry->>'quantity')::integer;
    if v_qty not between 1 and 20 then raise exception 'invalid_quantity'; end if;

    select i.id,i.name,i.price_cents into v_menu
    from public.menu_items i
    join public.menu_sections s on s.id=i.section_id and s.restaurant_id=i.restaurant_id
    where i.id=v_item_id and i.restaurant_id=v_restaurant
      and i.is_available and i.is_visible and s.is_visible
    limit 1;
    if not found then raise exception 'unavailable_menu_item'; end if;
    v_total := v_total + (v_qty::bigint * v_menu.price_cents);
    if v_total > 100000000 then raise exception 'order_total_too_large'; end if;
    v_snapshots := v_snapshots || jsonb_build_array(jsonb_build_object(
      'id',v_item_id,'name',v_menu.name,'price',v_menu.price_cents,'qty',v_qty
    ));
  end loop;

  insert into public.qr_orders(restaurant_id,table_id,qr_token_id,client_request_id,total_cents)
  values (v_restaurant,v_table,v_token_id,p_client_request_id,v_total::integer)
  on conflict (restaurant_id,table_id,client_request_id) do nothing
  returning id into v_order_id;
  if v_order_id is null then
    select * into v_existing from public.qr_orders
    where restaurant_id=v_restaurant and table_id=v_table and client_request_id=p_client_request_id;
    if not found then raise exception 'order_conflict'; end if;
    return jsonb_build_object('id',v_existing.id,'total_cents',v_existing.total_cents,'status',v_existing.status);
  end if;

  for v_snapshot in select value from jsonb_array_elements(v_snapshots) loop
    insert into public.qr_order_items(restaurant_id,order_id,menu_item_id,item_name,quantity,unit_price_cents)
    values(v_restaurant,v_order_id,(v_snapshot->>'id')::uuid,v_snapshot->>'name',
      (v_snapshot->>'qty')::integer,(v_snapshot->>'price')::integer);
  end loop;
  return jsonb_build_object('id',v_order_id,'total_cents',v_total,'status','pending');
end $$;
revoke all on function public.create_qr_order(text,uuid,jsonb) from public;
grant execute on function public.create_qr_order(text,uuid,jsonb) to anon, authenticated;

-- Staff workflow: server-validated transitions, immutable price data.
create function public.update_qr_order(
  p_order_id uuid, p_action text
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_order public.qr_orders%rowtype;
  v_role public.restaurant_user_role;
  v_next text;
begin
  if (select auth.jwt()->>'aal') is distinct from 'aal2'
    or auth.uid() is null then raise exception 'forbidden'; end if;
  select * into v_order from public.qr_orders where id=p_order_id for update;
  if not found then raise exception 'unknown_order'; end if;
  select ur.role into v_role from public.user_restaurants ur
  where ur.user_id=auth.uid() and ur.restaurant_id=v_order.restaurant_id and ur.active limit 1;
  if not found then raise exception 'forbidden'; end if;
  if p_action in ('mark_paid','mark_unpaid') then
    if v_role not in ('restaurant_owner','manager') or v_order.status='cancelled' then
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
revoke all on function public.update_qr_order(uuid,text) from public, anon;
grant execute on function public.update_qr_order(uuid,text) to authenticated;

-- Accurate aggregates across ALL orders, not a UI-sliced result set.
-- Only members with verified MFA can access them.
create function public.qr_order_report(
  p_restaurant_id uuid, p_day date
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_tz text;
  v_start timestamptz;
  v_end timestamptz;
  v_report jsonb;
begin
  if p_day is null or p_restaurant_id is null
     or (select auth.jwt()->>'aal') is distinct from 'aal2'
     or not exists(
       select 1 from public.user_restaurants ur
       where ur.restaurant_id=p_restaurant_id and ur.user_id=auth.uid() and ur.active
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
  return v_report;
end $$;
revoke all on function public.qr_order_report(uuid,date) from public, anon;
grant execute on function public.qr_order_report(uuid,date) to authenticated;
