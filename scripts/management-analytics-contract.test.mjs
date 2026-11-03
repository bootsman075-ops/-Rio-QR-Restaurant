import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("month and yearly revenue includes no manual or fictional revenue values",()=>{
  const sql=read("supabase/migrations/20261103160000_qr_management_analytics.sql");
  assert.match(sql,/interval '11 months'/);
  assert.match(sql,/interval '4 years'/);
  assert.match(sql,/interval '13 days'/);
  assert.match(sql,/o\.created_at >= b\.utc_start/);
  assert.match(sql,/o\.paid_at >= b\.utc_start/);
  assert.match(sql,/o\.status <> 'cancelled'/);
  assert.match(sql,/o\.payment_status='paid'/);
  assert.match(sql,/at time zone v_timezone/);
});
test("management financial report is protected by tenant membership and AAL2",()=>{
  const sql=read("supabase/migrations/20261103160000_qr_management_analytics.sql");
  assert.match(sql,/auth\.uid\(\)/);
  assert.match(sql,/auth\.jwt\(\)->>'aal'/);
  assert.match(sql,/ur\.role in \('restaurant_owner','manager'\)/);
  assert.match(sql,/revoke all on function public\.qr_management_analytics\(uuid\) from public, anon/);
  assert.match(sql,/grant execute on function public\.qr_management_analytics\(uuid\) to authenticated/);
});
test("management only gets real QR metrics and operational worktable",()=>{
  const page=read("src/app/management/page.tsx");
  const workspace=read("src/components/dashboard/management/ManagementWorkspace.tsx");
  const chart=read("src/components/dashboard/management/RevenueChart.tsx");
  assert.match(page,/isRio \? \(/);
  assert.match(page,/ManagementWorkspace/);
  assert.match(workspace,/\.rpc\("qr_management_analytics"/);
  assert.match(workspace,/Promise\.all\(/);
  assert.match(workspace,/reserveringen/i);
  assert.match(workspace,/geen geschatte bedragen/i);
  assert.match(chart,/day/);
  assert.match(chart,/month/);
  assert.match(chart,/year/);
  assert.match(chart,/aria-pressed/);
  assert.doesNotMatch(workspace,/ziekmelding|verlofmelding/i);
  assert.doesNotMatch(read("src/components/dashboard/areas.ts"),/ziekmelding|verlofmelding/i);
});
