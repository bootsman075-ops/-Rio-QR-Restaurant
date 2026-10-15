-- Rio QR: require a verified second factor for ALL authenticated data access.
-- These restrictive policies AND existing tenant/role policies must both allow a row.
-- In particular, a password-only (aal1) session must not use PostgREST to bypass
-- the /security/mfa dashboard gate. Anonymous read-only QR/menu policies remain intact.
--
-- IMPORTANT BEFORE APPLYING: verify all existing migrations and RLS grants,
-- exercise the AAL1 -> AAL2 login flow and two distinct restaurant tenants,
-- and take a database backup. This file is not yet applied to the inactive database.

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'restaurants',
    'tables',
    'qr_tokens',
    'menu_sections',
    'menu_items',
    'reservations',
    'service_requests',
    'platform_admins',
    'user_restaurants'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format(
      'drop policy if exists require_aal2_authenticated on public.%I',
      table_name
    );
    execute format(
      'create policy require_aal2_authenticated on public.%I as restrictive
       for all to authenticated
       using ((select auth.jwt() ->> ''aal'') = ''aal2'')
       with check ((select auth.jwt() ->> ''aal'') = ''aal2'')',
      table_name
    );
  end loop;
end $$;

-- The privileged service key bypasses RLS; keep it server-only and ensure
-- every privileged handler checks user authorization AND restaurant_id.
