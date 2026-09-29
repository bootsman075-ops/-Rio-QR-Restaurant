-- Replaceable QR tokens. A QR code encodes the token, never the table id, so a
-- code can be revoked (e.g. a sticker is lost or copied) by issuing a new one.

create table public.qr_tokens (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  table_id uuid not null,
  token text not null unique
    default replace(gen_random_uuid()::text, '-', '')
    check (length(token) >= 16),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,

  foreign key (restaurant_id, table_id)
    references public.tables (restaurant_id, id) on delete cascade
);

comment on table public.qr_tokens is 'QR tokens per table; at most one active (revoked_at is null) per table.';

-- At most one active token per table.
create unique index qr_tokens_one_active_per_table
  on public.qr_tokens (table_id)
  where revoked_at is null;

create index qr_tokens_restaurant_table_idx
  on public.qr_tokens (restaurant_id, table_id);

alter table public.qr_tokens enable row level security;

-- Revokes the table's active token (if any) and issues a new one.
-- Runs as the caller, so RLS applies.
create or replace function public.rotate_qr_token(p_table_id uuid)
returns public.qr_tokens
language plpgsql
set search_path = ''
as $$
declare
  v_restaurant_id uuid;
  v_token public.qr_tokens;
begin
  -- Lock the table row so concurrent rotations are serialized.
  select t.restaurant_id into v_restaurant_id
  from public.tables t
  where t.id = p_table_id
  for update;

  if v_restaurant_id is null then
    raise exception 'Table % not found', p_table_id;
  end if;

  update public.qr_tokens
  set revoked_at = now()
  where table_id = p_table_id
    and revoked_at is null;

  insert into public.qr_tokens (restaurant_id, table_id)
  values (v_restaurant_id, p_table_id)
  returning * into v_token;

  return v_token;
end;
$$;

revoke all on function public.rotate_qr_token(uuid) from public, anon;
