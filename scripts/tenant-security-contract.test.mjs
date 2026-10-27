import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

const permissions = read("src/lib/permissions.ts");
const qrPage = read("src/app/qr/[token]/page.tsx");
const guestService = read("src/app/api/guest/service-request/route.ts");
const platformPage = read("src/app/platform/page.tsx");
const separationMigration = read(
  "supabase/migrations/20261027101459_separate_platform_admin_from_tenant_data.sql",
);
const mfaMigration = read(
  "supabase/migrations/20261027102034_require_verified_mfa_for_tenant_data.sql",
);

test("platform admin is not implicitly a restaurant manager", () => {
  assert.match(permissions, /role === "platform_admin"\) \{\s*return false;/);
  assert.match(permissions, /context\.role === "platform_admin" \? "\/platform" : "\/staff"/);
});

test("guest QR flow never uses the service-role admin client", () => {
  assert.doesNotMatch(qrPage, /createAdminClient/);
  assert.match(qrPage, /rpc\("resolve_qr_token"/);
  assert.doesNotMatch(guestService, /createAdminClient/);
  assert.match(guestService, /rpc\("create_service_request"/);
});

test("central platform directory is server-admin only", () => {
  assert.match(platformPage, /createAdminClient/);
  assert.doesNotMatch(platformPage, /createClient\(\)/);
  assert.match(platformPage, /context\.role !== "platform_admin"/);
});

test("tenant RLS no longer grants platform-admin bypasses", () => {
  assert.doesNotMatch(separationMigration, /platform_admins\s+pa/i);
  assert.match(separationMigration, /user_restaurants\s+ur/i);
  assert.match(separationMigration, /ur\.restaurant_id = menu_items\.restaurant_id/);
  assert.match(separationMigration, /ur\.restaurant_id = service_requests\.restaurant_id/);
  assert.match(separationMigration, /ur\.role in \('restaurant_owner', 'manager'\)/);
});

test("authenticated tenant data requires verified MFA", () => {
  assert.match(mfaMigration, /as restrictive/i);
  assert.match(mfaMigration, /for all to authenticated/i);
  assert.match(mfaMigration, /auth\.jwt\(\) ->> ''aal''/);
  assert.match(mfaMigration, /= ''aal2''/);
});
