import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("staff goes through server-side role routing, not an unchecked MFA bypass",()=>{
  const a=read("src/components/dashboard/auth-actions.ts");
  const context=read("src/lib/staff-session.ts");
  const continued=read("src/app/auth/continue/page.tsx");
  assert.match(a,/loginWithPassword\(formData, "\/staff\/login"\)/);
  assert.match(a,/redirect\("\/auth\/continue"\)/);
  assert.match(continued,/getStaffContext\(\)/);
  assert.match(context,/assurance\.currentLevel !== "aal2" && membership\.role !== "staff"/);
  assert.match(context,/redirect\("\/security\/mfa"\)/);
  assert.match(context,/\.from\("user_restaurants"\)/);
  assert.match(context,/\.eq\("user_id", user\.id\)/);
  assert.doesNotMatch(context,/createAdminClient/);
});

test("management and platform admin still require AAL2",()=>{
  const ctx=read("src/lib/staff-session.ts");
  const a=read("src/components/dashboard/auth-actions.ts");
  const sql=read("supabase/migrations/20261103190000_staff_aal1_management_aal2.sql");
  assert.match(ctx,/if \(hasVerifiedMfa\)/);
  assert.match(ctx,/\.from\("platform_admins"\)/);
  assert.match(a,/export async function managementLogin/);
  assert.match(a,/redirect\("\/security\/mfa"\)/);
  assert.match(sql,/role in \('restaurant_owner','manager'\) and \(auth\.jwt\(\)->>'aal'\)='aal2'/);
  assert.doesNotMatch(sql,/drop policy if exists require_aal2_authenticated on public\.platform_admins/);
  assert.doesNotMatch(sql,/drop policy if exists require_aal2_authenticated on public\.menu_items/);
});

test("staff AAL1 database access is limited to active staff membership and tenant",()=>{
  const sql=read("supabase/migrations/20261103190000_staff_aal1_management_aal2.sql");
  assert.match(sql,/create function public\.is_active_staff_member/);
  assert.match(sql,/ur\.role = 'staff'/);
  assert.match(sql,/ur\.active/);
  assert.match(sql,/ur\.restaurant_id = p_restaurant_id/);
  assert.match(sql,/security definer/);
  assert.match(sql,/user_id = \(select auth\.uid\(\)\) and active/);
  assert.match(sql,/with check \(\(select auth\.jwt\(\)->>'aal'\) = 'aal2'\)/);
  for(const table of ["restaurants","tables","reservations","service_requests"]){
    assert.match(sql,new RegExp("create policy require_verified_or_staff on public\\."+table));
  }
  assert.match(sql,/qr_orders_read_tenant/);
  assert.match(sql,/qr_order_items_read_tenant/);
});

test("staff cannot mark invoices paid or read management revenue",()=>{
  const sql=read("supabase/migrations/20261103190000_staff_aal1_management_aal2.sql");
  const dash=read("src/components/dashboard/management/ManagementWorkspace.tsx");
  assert.match(sql,/p_action in \('mark_paid','mark_unpaid'\)/);
  assert.match(sql,/v_role not in \('restaurant_owner','manager'\)/);
  assert.match(sql,/v_role = 'staff' then/);
  assert.match(sql,/'paid_value_cents',0/);
  assert.match(sql,/'order_value_cents',0/);
  assert.match(sql,/'top_items','\[\]'::jsonb/);
  assert.match(sql,/qr_management_analytics remains unchanged/);
  assert.match(dash,/\.rpc\("qr_management_analytics"/);
});
