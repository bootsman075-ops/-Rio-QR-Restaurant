import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";
const read=(name)=>readFileSync(new URL("../"+name,import.meta.url),"utf8");

test("payment integration starts disabled with no selected provider",()=>{
  const migration=read("supabase/migrations/20261103210000_qr_payment_readiness.sql");
  const page=read("src/app/management/betalingen/page.tsx");
  assert.match(migration,/checkout_enabled boolean not null default false/);
  assert.match(migration,/provider_code text,/);
  assert.match(migration,/on conflict \(restaurant_id\) do nothing/);
  assert.match(migration,/webhook_verified_at is not null/);
  assert.match(page,/Nog niet actief/);
  assert.match(page,/Nog niet gekozen/);
  assert.match(page,/geen betaling gestart, geïncasseerd/);
  assert.doesNotMatch(page,/<form|onClick|createCheckout/);
});

test("payment records are constrained to an order in the same restaurant and idempotent",()=>{
  const sql=read("supabase/migrations/20261103210000_qr_payment_readiness.sql");
  assert.match(sql,/foreign key \(restaurant_id,order_id\)/);
  assert.match(sql,/references public\.qr_orders\(restaurant_id,id\)/);
  assert.match(sql,/unique \(restaurant_id,order_id,idempotency_key\)/);
  assert.match(sql,/unique\(restaurant_id,provider_code,provider_event_id\)/);
  assert.match(sql,/payload_sha256 text not null/);
  assert.match(sql,/status = 'succeeded' and confirmed_at is not null/);
  assert.doesNotMatch(sql,/update public\.qr_orders|alter table public\.qr_orders/i);
});

test("provider secrets are not in the database, UI or bundled client code",()=>{
  const sql=read("supabase/migrations/20261103210000_qr_payment_readiness.sql");
  const page=read("src/app/management/betalingen/page.tsx");
  const provider=read("src/lib/payments/provider.ts");
  assert.doesNotMatch(sql,/api_secret|secret_key|card_number|cvv|pan_number/i);
  assert.doesNotMatch(page,/api_secret|secret_key|createAdminClient/);
  assert.match(provider,/import "server-only"/);
  assert.match(provider,/throw new Error\("QR_ONLINE_PAYMENTS_NOT_CONFIGURED"\)/);
  assert.match(provider,/verifyWebhookSignature/);
  assert.match(provider,/idempotencyKey/);
  assert.equal(existsSync(new URL("../src/app/api/guest/qr-payments",import.meta.url)),false);
});

test("RLS requires MFA and manager membership, with no browser write grants",()=>{
  const sql=read("supabase/migrations/20261103210000_qr_payment_readiness.sql");
  assert.match(sql,/qr_payment_settings enable row level security/);
  assert.match(sql,/qr_payment_attempts enable row level security/);
  assert.match(sql,/qr_payment_events enable row level security/);
  assert.match(sql,/ur\.role in \('manager','restaurant_owner'\)/);
  assert.match(sql,/auth\.jwt\(\)->>'aal'\)='aal2'/);
  assert.match(sql,/revoke all on table[\s\S]*?from public,anon,authenticated/);
  assert.match(sql,/grant select on table[\s\S]*?to authenticated/);
  assert.doesNotMatch(sql,/grant (insert|update|delete|all) on table/i);
});

test("management-only RIO payments page and navigation exist",()=>{
  const p=read("src/app/management/betalingen/page.tsx");
  const areas=read("src/components/dashboard/areas.ts");
  const nav=read("src/components/dashboard/DashboardNav.tsx");
  const workspace=read("src/components/dashboard/management/ManagementWorkspace.tsx");
  assert.match(p,/requirePermissionContext\("management\.access"\)/);
  assert.match(p,/context\.restaurantSlug !== "rio-deventer"/);
  assert.match(p,/\.from\("qr_payment_settings"\)/);
  assert.match(p,/\.from\("qr_payment_attempts"\)/);
  assert.match(areas,/payments: "\/management\/betalingen"/);
  assert.match(nav,/item\.key !== "payments"/);
  assert.match(workspace,/href="\/management\/betalingen"/);
});
