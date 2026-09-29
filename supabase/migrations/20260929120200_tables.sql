-- Physical tables in a restaurant.

create table public.tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null
    references public.restaurants (id) on delete cascade,
  number integer not null
    check (number > 0),
  label text,
  seats integer
    check (seats > 0),
  area text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (restaurant_id, number),
  -- Target for composite foreign keys, so child rows cannot point at a table
  -- belonging to a different restaurant.
  unique (restaurant_id, id)
);

comment on table public.tables is 'Tables within a restaurant; number is unique per restaurant.';
comment on column public.tables.label is 'Optional display name, e.g. "Raamtafel". Falls back to the number.';
comment on column public.tables.area is 'Optional zone, e.g. "binnen" or "terras".';

create trigger tables_set_updated_at
  before update on public.tables
  for each row execute function public.set_updated_at();

alter table public.tables enable row level security;
