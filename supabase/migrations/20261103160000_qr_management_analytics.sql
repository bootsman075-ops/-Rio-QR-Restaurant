-- RIO management: bounded day/month/year analytics from real QR orders only.
-- Non-destructive, tenant-scoped, and requires an AAL2 management account.
create index if not exists qr_orders_restaurant_paid_at_idx
  on public.qr_orders (restaurant_id, paid_at)
  where payment_status = 'paid' and paid_at is not null;

create function public.qr_management_analytics(p_restaurant_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_timezone text;
  v_local_now timestamp;
  v_result jsonb;
begin
  if p_restaurant_id is null or auth.uid() is null
    or (auth.jwt()->>'aal') is distinct from 'aal2'
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
$$;

revoke all on function public.qr_management_analytics(uuid) from public, anon;
grant execute on function public.qr_management_analytics(uuid) to authenticated;
