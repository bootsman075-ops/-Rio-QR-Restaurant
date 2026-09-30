-- Serviceverzoeken vanaf een geldige QR-code.
-- Gasten krijgen geen directe toegang tot deze tabel.

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null
    references public.restaurants(id) on delete cascade,
  table_id uuid not null,
  request_type text not null
    check (request_type in ('service', 'bill')),
  status text not null default 'pending'
    check (status in ('pending', 'handled', 'cancelled')),
  created_at timestamptz not null default now(),
  handled_at timestamptz,

  foreign key (restaurant_id, table_id)
    references public.tables (restaurant_id, id)
    on delete cascade
);

create index service_requests_restaurant_status_idx
  on public.service_requests (restaurant_id, status, created_at desc);

create index service_requests_table_idx
  on public.service_requests (table_id, created_at desc);

alter table public.service_requests enable row level security;

revoke all on table public.service_requests from anon, authenticated;

create or replace function public.create_service_request(
  p_token text,
  p_request_type text
)
returns table (
  request_id uuid,
  request_type text,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_restaurant_id uuid;
  v_table_id uuid;
  v_request public.service_requests;
begin
  if p_request_type not in ('service', 'bill') then
    raise exception 'Invalid request type';
  end if;

  select
    q.restaurant_id,
    q.table_id
  into
    v_restaurant_id,
    v_table_id
  from public.qr_tokens q
  join public.tables t
    on t.id = q.table_id
   and t.restaurant_id = q.restaurant_id
  join public.restaurants r
    on r.id = q.restaurant_id
  where q.token = p_token
    and q.revoked_at is null
    and t.is_active = true
    and r.is_active = true
  limit 1;

  if v_table_id is null then
    raise exception 'Invalid or inactive QR token';
  end if;

  -- Voorkomt veel dezelfde meldingen vlak achter elkaar.
  select *
  into v_request
  from public.service_requests sr
  where sr.restaurant_id = v_restaurant_id
    and sr.table_id = v_table_id
    and sr.request_type = p_request_type
    and sr.status = 'pending'
    and sr.created_at > now() - interval '2 minutes'
  order by sr.created_at desc
  limit 1;

  if v_request.id is null then
    insert into public.service_requests (
      restaurant_id,
      table_id,
      request_type
    )
    values (
      v_restaurant_id,
      v_table_id,
      p_request_type
    )
    returning * into v_request;
  end if;

  return query
  select
    v_request.id,
    v_request.request_type,
    v_request.status,
    v_request.created_at;
end;
$$;

revoke all on function public.create_service_request(text, text) from public;
grant execute on function public.create_service_request(text, text)
  to anon, authenticated;
