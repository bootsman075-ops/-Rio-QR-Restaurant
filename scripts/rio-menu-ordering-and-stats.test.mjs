import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
const read = (file) => readFileSync(new URL("../" + file, import.meta.url),"utf8");

test("category reordering is atomic, authorized and tenant scoped", () => {
  const sql=read("supabase/migrations/20261103193000_rio_category_ordering.sql");
  assert.match(sql,/auth\.uid\(\)/);
  assert.match(sql,/auth\.jwt\(\)->>'aal'/);
  assert.match(sql,/ur\.role in \('restaurant_owner','manager'\)/);
  assert.match(sql,/from public\.restaurants where id=p_restaurant_id and is_active for update/);
  assert.match(sql,/array_agg\(id order by sort_order, name, id\)/);
  assert.match(sql,/where restaurant_id=p_restaurant_id and id=v_ids\[v_i\]/);
  assert.match(sql,/row_number\(\) over \(order by sort_order, name, id\)/);
  assert.match(sql,/where slug='rio-deventer'/);
  assert.doesNotMatch(sql,/delete from public\.menu_sections|delete from public\.menu_items/i);
});
test("management category up and down buttons call the RPC", () => {
  const view=read("src/components/dashboard/menu/MenuView.tsx");
  const action=read("src/components/dashboard/menu/actions.ts");
  assert.match(view,/sections\.map\(\(section, sectionIndex\)/);
  assert.match(view,/Categorie \$\{section\.name\} omhoog/);
  assert.match(view,/Categorie \$\{section\.name\} omlaag/);
  assert.match(view,/action=\{moveSection\}/);
  assert.match(action,/\.rpc\("move_menu_section"/);
  assert.match(action,/requirePermissionContext\("menu\.manage"\)/);
});
test("guest sections share deterministic menu sort order", () => {
  const guest=read("src/app/qr/[token]/page.tsx");
  assert.match(guest,/\.from\("menu_sections"\)[\s\S]*?\.order\("sort_order"\)\s*\.order\("name"\)/);
  assert.match(guest,/\.from\("menu_items"\)[\s\S]*?\.order\("sort_order"\)\s*\.order\("name"\)/);
});
test("Rio management gets charts and all statistics in a protected dashboard", () => {
  const areas=read("src/components/dashboard/areas.ts");
  const nav=read("src/components/dashboard/DashboardNav.tsx");
  const page=read("src/app/management/statistieken/page.tsx");
  const main=read("src/components/dashboard/management/ManagementWorkspace.tsx");
  const chart=read("src/components/dashboard/management/RevenueChart.tsx");
  assert.match(areas,/Statistieken/);
  assert.match(nav,/context\?\.restaurantSlug === "rio-deventer"/);
  assert.match(page,/requirePermissionContext\("management\.access"\)/);
  assert.match(page,/\.rpc\("qr_management_analytics"/);
  assert.match(page,/QrDashboardSummary/);
  assert.match(page,/RevenueChart/);
  assert.match(chart,/month/); assert.match(chart,/year/); assert.match(chart,/day/);
  assert.match(main,/management\/statistieken/);
  assert.match(page,/geen geschatte omzetbedragen/);
});
