-- Prevent bulk public booking spam while preserving the existing reservation flow.
-- Store only HMAC fingerprints of IP/email; never raw addresses.
-- Authenticated and anonymous clients have NO direct access to this table/RPC.
create table if not exists public.guest_reservation_rate_limits (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  scope text not null check (scope in ('ip', 'email')),
  fingerprint text not null check (length(fingerprint) = 64),
  window_start timestamptz not null default now(),
  hits integer not null default 0 check (hits >= 0),
  primary key (restaurant_id, scope, fingerprint)
);
create index if not exists guest_reservation_rate_limits_cleanup_idx
  on public.guest_reservation_rate_limits(window_start);
alter table public.guest_reservation_rate_limits enable row level security;
revoke all on table public.guest_reservation_rate_limits from public, anon, authenticated;

create or replace function public.reserve_guest_booking_quota(
  p_restaurant_id uuid, p_scope text, p_fingerprint text, p_limit integer
) returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  updated_hits integer;
begin
  if p_restaurant_id is null or p_scope not in ('ip', 'email')
     or length(p_fingerprint) <> 64 or p_limit < 1 or p_limit > 20
  then
    return false;
  end if;
  delete from public.guest_reservation_rate_limits
  where window_start < now() - interval '7 days';

  insert into public.guest_reservation_rate_limits
    (restaurant_id, scope, fingerprint, window_start, hits)
  values (p_restaurant_id, p_scope, p_fingerprint, now(), 1)
  on conflict (restaurant_id, scope, fingerprint)
  do update set
    hits = case
      when guest_reservation_rate_limits.window_start < now() - interval '1 hour'
      then 1
      else guest_reservation_rate_limits.hits + 1
    end,
    window_start = case
      when guest_reservation_rate_limits.window_start < now() - interval '1 hour'
      then now()
      else guest_reservation_rate_limits.window_start
    end
  returning hits into updated_hits;

  return updated_hits <= p_limit;
end
$function$;
revoke all on function public.reserve_guest_booking_quota(uuid, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.reserve_guest_booking_quota(uuid, text, text, integer)
  to service_role;
