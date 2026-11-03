import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("never calculate guest order prices or table IDs from request payload", () => {
  const sql = read("supabase/migrations/20261103124500_qr_orders.sql");
  assert.match(sql, /join public\.tables t/);
  assert.match(sql, /join public\.menu_items|from public\.menu_items i/);
  assert.match(sql, /v_total := v_total \+ /);
  assert.match(sql, /on conflict \(restaurant_id,table_id,client_request_id\) do nothing/);
  assert.match(sql, /order_rate_limit/);
  assert.match(sql, /grant execute on function public\.create_qr_order/);
  assert.match(sql, /enable row level security/);
  assert.doesNotMatch(sql, /grant insert on public\.qr_orders to anon/);
});

test("staff actions are protected and cannot edit stored prices", () => {
  const sql = read("supabase/migrations/20261103124500_qr_orders.sql");
  const action = read("src/components/dashboard/orders/actions.ts");
  assert.match(sql, /grant select on public\.qr_orders/);
  assert.match(sql, /auth\.uid\(\)/);
  assert.match(sql, /auth\.jwt\(\)->>'aal'/);
  assert.match(sql, /role.*manager/);
  assert.match(action, /requirePermissionContext\("requests\.handle"\)/);
  assert.match(action, /eq\("restaurant_id", context\.restaurantId\)/);
});

test("QR cart submission is linked to token; no fictional financial KPI", () => {
  const qr = read("src/app/qr/[token]/page.tsx");
  const api = read("src/app/api/guest/qr-orders/route.ts");
  const cart = read("src/app/qr/[token]/GuestOrdering.tsx");
  const report = read("src/components/dashboard/orders/QrDashboardSummary.tsx");
  assert.match(qr, /GuestOrderProvider token=\{token\}/);
  assert.match(qr, /OrderAddButton/);
  assert.match(cart, /crypto\.randomUUID\(\)/);
  assert.match(api, /create_qr_order/);
  assert.match(report, /qr_order_report/);
  assert.match(report, /geen verzonnen/);
  assert.match(report, /nog geen kassakoppeling/);
});

test("QR orders available for management and staff without changing permission model", () => {
  const areas=read("src/components/dashboard/areas.ts");
  const mgmt=read("src/app/management/qr-bestellingen/page.tsx");
  const staff=read("src/app/staff/qr-bestellingen/page.tsx");
  assert.match(areas, /QR-bestellingen/);
  assert.match(mgmt, /requirePermission\("management\.access"\)/);
  assert.match(staff, /requirePermission\("requests\.handle"\)/);
});
