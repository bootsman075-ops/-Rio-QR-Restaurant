-- Digital menu: sections (e.g. "Voorgerechten") containing items.

create table public.menu_sections (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null
    references public.restaurants (id) on delete cascade,
  name text not null
    check (length(trim(name)) > 0),
  description text,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (restaurant_id, id)
);

comment on table public.menu_sections is 'Menu sections per restaurant, ordered by sort_order.';

create index menu_sections_restaurant_sort_idx
  on public.menu_sections (restaurant_id, sort_order);

create trigger menu_sections_set_updated_at
  before update on public.menu_sections
  for each row execute function public.set_updated_at();

alter table public.menu_sections enable row level security;


create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  section_id uuid not null,
  name text not null
    check (length(trim(name)) > 0),
  description text,
  price_cents integer not null
    check (price_cents >= 0),
  allergens text[] not null default '{}',
  tags text[] not null default '{}',
  image_url text,
  sort_order integer not null default 0,
  is_available boolean not null default true,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  foreign key (restaurant_id, section_id)
    references public.menu_sections (restaurant_id, id) on delete cascade
);

comment on table public.menu_items is 'Dishes and drinks within a menu section.';
comment on column public.menu_items.price_cents is 'Price in euro cents (1250 = EUR 12,50) to avoid float rounding.';
comment on column public.menu_items.allergens is 'EU allergen codes, e.g. {gluten,milk,nuts}.';
comment on column public.menu_items.tags is 'Free labels, e.g. {vegetarian,vegan,spicy}.';
comment on column public.menu_items.is_available is 'False = temporarily sold out, still shown.';
comment on column public.menu_items.is_visible is 'False = hidden from guests entirely.';

create index menu_items_restaurant_section_idx
  on public.menu_items (restaurant_id, section_id);

create index menu_items_section_sort_idx
  on public.menu_items (section_id, sort_order);

create trigger menu_items_set_updated_at
  before update on public.menu_items
  for each row execute function public.set_updated_at();

alter table public.menu_items enable row level security;
