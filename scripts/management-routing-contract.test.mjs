import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("management route without a session opens the management login", () => {
  const p = read("src/lib/permissions.ts");
  assert.match(p, /managementOnly\(permission\) \? "\/management\/login" : "\/login"/);
  assert.match(p, /permission === "management\.access"/);
  assert.match(p, /permission === "menu\.manage"/);
  assert.match(p, /permission === "reservations\.delete"/);
});

test("staff attempting management is prompted to switch accounts, never sent to staff", () => {
  const p = read("src/lib/permissions.ts");
  assert.match(p, /redirect\(managementOnly\(permission\)\s*\? "\/management\/login\?error=access"\s*:\s*"\/staff"\)/);
  assert.match(p, /context\.role === "platform_admin"/);
  assert.match(p, /if \(!can\(context\.role, permission\)\)/);
  const login = read("src/app/management/login/page.tsx");
  assert.match(login, /managementaccount/);
  assert.match(login, /managementLogin/);
  assert.match(login, /personeel ingelogd/);
});

test("protected management pages use the role-bound gateway", () => {
  const pages = [
    "src/app/management/page.tsx",
    "src/app/management/menu/page.tsx",
    "src/app/management/reserveringen/page.tsx",
    "src/app/management/tafelverzoeken/page.tsx",
    "src/app/management/qr-bestellingen/page.tsx",
    "src/app/management/statistieken/page.tsx",
  ];
  for (const page of pages) {
    const code = read(page);
    assert.match(code, /requirePermission(?:Context)?\("management\.access"\)/, page);
  }
});

test("management still requires MFA and staff has no finance permissions", () => {
  const ctx = read("src/lib/staff-session.ts");
  const auth = read("src/components/dashboard/auth-actions.ts");
  assert.match(ctx, /assurance\.currentLevel !== "aal2" && membership\.role !== "staff"/);
  assert.match(auth, /export async function managementLogin/);
  assert.match(auth, /redirect\("\/security\/mfa"\)/);
  assert.match(auth, /\.in\("role", \["restaurant_owner", "manager"\]\)/);
});
