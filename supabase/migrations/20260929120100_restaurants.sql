-- Restaurants: the tenant root. Every other table references restaurant_id.

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null
    check (length(trim(name)) > 0),
  city text,
  timezone text not null default 'Europe/Amsterdam',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.restaurants is 'Tenant root; one row per restaurant.';
comment on column public.restaurants.slug is 'URL-safe identifier, e.g. rio-deventer.';

create trigger restaurants_set_updated_at
  before update on public.restaurants
  for each row execute function public.set_updated_at();

-- RLS on, no policies yet: only the secret key has access until auth policies
-- are added in a later migration.
alter table public.restaurants enable row level security;
