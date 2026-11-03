-- Provider-neutral payment foundation for RIO QR Restaurant.
-- IMPORTANT: checkout stays disabled until a provider adapter, verified webhook,
-- and successful sandbox/live tests have been deployed. No existing orders change.
-- Only service-role backend code may create/update payment attempts or events.
create table public.qr_payment_settings (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  provider_code text,
  environment text not null default 'sandbox'
    check (environment in ('sandbox','live')),
  checkout_enabled boolean not null default false,
  webhook_verified_at timestamptz,
  currency text not null default 'EUR' check (currency = 'EUR'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint qr_payment_provider_code_format check (
    provider_code is null or (
      provider_code ~ '^[a-z][a-z0-9_-]{1,63}$'
    )
  ),
  constraint qr_payment_no_unverified_checkout check (
    checkout_enabled is false or
    (provider_code is not null and webhook_verified_at is not null)
  )
);

create table public.qr_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  order_id uuid not null,
  provider_code text not null
    check (provider_code ~ '^[a-z][a-z0-9_-]{1,63}$'),
  idempotency_key uuid not null,
  provider_payment_id text,
  status text not null default 'created'
    check (status in (
      'created','pending','succeeded','failed','cancelled','expired',
      'refunded','partially_refunded'
    )),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'EUR' check (currency = 'EUR'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  constraint qr_payment_attempt_tenant_order_fk
    foreign key (restaurant_id,order_id)
    references public.qr_orders(restaurant_id,id) on delete restrict,
  constraint qr_payment_attempt_restaurant_id_id_uniq unique(restaurant_id,id),
  constraint qr_payment_attempt_idempotency_uniq
    unique (restaurant_id,order_id,idempotency_key),
  constraint qr_payment_attempt_confirmed_consistent check (
    (status = 'succeeded' and confirmed_at is not null)
    or (status <> 'succeeded')
  )
);
create unique index qr_payment_attempt_provider_reference_idx
  on public.qr_payment_attempts (restaurant_id,provider_code,provider_payment_id)
  where provider_payment_id is not null;
create index qr_payment_attempt_order_recent_idx
  on public.qr_payment_attempts (restaurant_id,order_id,created_at desc);

-- This records provider event identifiers, NOT raw card/payment credentials.
-- Webhook verification MUST happen before a future backend inserts an event.
create table public.qr_payment_events (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  attempt_id uuid,
  provider_code text not null
    check (provider_code ~ '^[a-z][a-z0-9_-]{1,63}$'),
  provider_event_id text not null check (char_length(provider_event_id) between 1 and 255),
  event_type text not null check (char_length(event_type) between 1 and 100),
  payload_sha256 text not null check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  verified_at timestamptz not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint qr_payment_event_attempt_fk
    foreign key (restaurant_id,attempt_id)
    references public.qr_payment_attempts(restaurant_id,id) on delete restrict,
  constraint qr_payment_provider_event_once
    unique(restaurant_id,provider_code,provider_event_id)
);
create index qr_payment_events_attempt_idx
  on public.qr_payment_events(restaurant_id,attempt_id,created_at desc);

alter table public.qr_payment_settings enable row level security;
alter table public.qr_payment_attempts enable row level security;
alter table public.qr_payment_events enable row level security;

-- Only the restaurant's own AAL2 manager/owner can read payment metadata.
-- Staff cannot access these tables even if they independently reach AAL2.
create policy qr_payment_settings_management_read on public.qr_payment_settings
  for select to authenticated using (
    auth.uid() is not null
    and (auth.jwt()->>'aal')='aal2'
    and exists (
      select 1 from public.user_restaurants ur
      where ur.restaurant_id=qr_payment_settings.restaurant_id
        and ur.user_id=auth.uid() and ur.active
        and ur.role in ('manager','restaurant_owner')
    )
  );
create policy qr_payment_attempts_management_read on public.qr_payment_attempts
  for select to authenticated using (
    auth.uid() is not null
    and (auth.jwt()->>'aal')='aal2'
    and exists (
      select 1 from public.user_restaurants ur
      where ur.restaurant_id=qr_payment_attempts.restaurant_id
        and ur.user_id=auth.uid() and ur.active
        and ur.role in ('manager','restaurant_owner')
    )
  );
create policy qr_payment_events_management_read on public.qr_payment_events
  for select to authenticated using (
    auth.uid() is not null
    and (auth.jwt()->>'aal')='aal2'
    and exists (
      select 1 from public.user_restaurants ur
      where ur.restaurant_id=qr_payment_events.restaurant_id
        and ur.user_id=auth.uid() and ur.active
        and ur.role in ('manager','restaurant_owner')
    )
  );

-- No browser or guest role may mutate settings/attempts/events.
revoke all on table
  public.qr_payment_settings,
  public.qr_payment_attempts,
  public.qr_payment_events
from public,anon,authenticated;
grant select on table
  public.qr_payment_settings,
  public.qr_payment_attempts,
  public.qr_payment_events
to authenticated;

-- RIO is intentionally disabled and not assigned a provider.
insert into public.qr_payment_settings (restaurant_id)
select id from public.restaurants where slug='rio-deventer'
on conflict (restaurant_id) do nothing;
