create type public.restaurant_user_role as enum ('restaurant_owner','manager','staff');

create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.user_restaurants (
  user_id uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  role public.restaurant_user_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, restaurant_id)
);

create index user_restaurants_restaurant_idx
  on public.user_restaurants (restaurant_id, active, role);

alter table public.platform_admins enable row level security;
alter table public.user_restaurants enable row level security;

revoke all on table public.platform_admins from anon;
revoke all on table public.user_restaurants from anon;

grant select on public.platform_admins to authenticated;
grant select on public.user_restaurants to authenticated;

create policy "platform_admins_read_self"
on public.platform_admins
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "user_restaurants_read_own"
on public.user_restaurants
for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  )
);

grant select, insert, update, delete on public.tables to authenticated;
grant select, insert, update, delete on public.qr_tokens to authenticated;
grant select, insert, update, delete on public.reservations to authenticated;
grant select, update, delete on public.service_requests to authenticated;
grant insert, update, delete on public.menu_sections to authenticated;
grant insert, update, delete on public.menu_items to authenticated;

create policy "tenant_tables_read"
on public.tables
for select to authenticated
using (
  exists (
    select 1 from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = tables.restaurant_id
      and ur.active
  )
  or exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  )
);

create policy "tenant_tables_write"
on public.tables
for all to authenticated
using (
  exists (
    select 1 from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = tables.restaurant_id
      and ur.active
      and ur.role in ('restaurant_owner','manager')
  )
  or exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = tables.restaurant_id
      and ur.active
      and ur.role in ('restaurant_owner','manager')
  )
  or exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  )
);

create policy "tenant_qr_tokens_read"
on public.qr_tokens
for select to authenticated
using (
  exists (
    select 1 from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = qr_tokens.restaurant_id
      and ur.active
  )
  or exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  )
);

create policy "tenant_qr_tokens_write"
on public.qr_tokens
for all to authenticated
using (
  exists (
    select 1 from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = qr_tokens.restaurant_id
      and ur.active
      and ur.role in ('restaurant_owner','manager')
  )
  or exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = qr_tokens.restaurant_id
      and ur.active
      and ur.role in ('restaurant_owner','manager')
  )
  or exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  )
);

create policy "tenant_reservations_read"
on public.reservations
for select to authenticated
using (
  exists (
    select 1 from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = reservations.restaurant_id
      and ur.active
  )
  or exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  )
);

create policy "tenant_reservations_insert"
on public.reservations
for insert to authenticated
with check (
  exists (
    select 1 from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = reservations.restaurant_id
      and ur.active
  )
  or exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  )
);

create policy "tenant_reservations_update"
on public.reservations
for update to authenticated
using (
  exists (
    select 1 from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = reservations.restaurant_id
      and ur.active
  )
  or exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = reservations.restaurant_id
      and ur.active
  )
  or exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  )
);

create policy "tenant_reservations_delete"
on public.reservations
for delete to authenticated
using (
  exists (
    select 1 from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = reservations.restaurant_id
      and ur.active
      and ur.role in ('restaurant_owner','manager')
  )
  or exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  )
);

create policy "tenant_service_requests_read"
on public.service_requests
for select to authenticated
using (
  exists (
    select 1 from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = service_requests.restaurant_id
      and ur.active
  )
  or exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  )
);

create policy "tenant_service_requests_update"
on public.service_requests
for update to authenticated
using (
  exists (
    select 1 from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = service_requests.restaurant_id
      and ur.active
  )
  or exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = service_requests.restaurant_id
      and ur.active
  )
  or exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  )
);

create policy "tenant_service_requests_delete"
on public.service_requests
for delete to authenticated
using (
  exists (
    select 1 from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = service_requests.restaurant_id
      and ur.active
      and ur.role in ('restaurant_owner','manager')
  )
  or exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  )
);

create policy "tenant_menu_sections_read_all_own"
on public.menu_sections
for select to authenticated
using (
  exists (
    select 1 from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = menu_sections.restaurant_id
      and ur.active
  )
  or exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  )
);

create policy "tenant_menu_sections_write"
on public.menu_sections
for all to authenticated
using (
  exists (
    select 1 from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = menu_sections.restaurant_id
      and ur.active
      and ur.role in ('restaurant_owner','manager')
  )
  or exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = menu_sections.restaurant_id
      and ur.active
      and ur.role in ('restaurant_owner','manager')
  )
  or exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  )
);

create policy "tenant_menu_items_read_all_own"
on public.menu_items
for select to authenticated
using (
  exists (
    select 1 from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = menu_items.restaurant_id
      and ur.active
  )
  or exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  )
);

create policy "tenant_menu_items_write"
on public.menu_items
for all to authenticated
using (
  exists (
    select 1 from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = menu_items.restaurant_id
      and ur.active
      and ur.role in ('restaurant_owner','manager')
  )
  or exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.user_restaurants ur
    where ur.user_id = (select auth.uid())
      and ur.restaurant_id = menu_items.restaurant_id
      and ur.active
      and ur.role in ('restaurant_owner','manager')
  )
  or exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  )
);
