-- Reservations, optionally assigned to a table.

create type public.reservation_status as enum (
  'pending',
  'confirmed',
  'seated',
  'completed',
  'cancelled',
  'no_show'
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null
    references public.restaurants (id) on delete cascade,
  table_id uuid,
  guest_name text not null
    check (length(trim(guest_name)) > 0),
  guest_phone text,
  guest_email text,
  party_size integer not null
    check (party_size > 0),
  starts_at timestamptz not null,
  ends_at timestamptz,
  status public.reservation_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (ends_at is null or ends_at > starts_at),

  -- Deleting a table keeps the reservation but unassigns it.
  foreign key (restaurant_id, table_id)
    references public.tables (restaurant_id, id) on delete set null (table_id)
);

comment on table public.reservations is 'Reservations per restaurant; table_id is null until a table is assigned.';

create index reservations_restaurant_starts_idx
  on public.reservations (restaurant_id, starts_at);

create index reservations_restaurant_table_idx
  on public.reservations (restaurant_id, table_id)
  where table_id is not null;

create trigger reservations_set_updated_at
  before update on public.reservations
  for each row execute function public.set_updated_at();

alter table public.reservations enable row level security;
