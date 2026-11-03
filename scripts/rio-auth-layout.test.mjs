import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("the original Rio logo is installed as a usable asset", () => {
  assert.ok(statSync(new URL("../public/rio-logo.png", import.meta.url)).size > 1000);
});

test("management and staff use one consistent branded login component", () => {
  const component = read("src/components/dashboard/LoginCard.tsx");
  const management = read("src/app/management/login/page.tsx");
  const staff = read("src/app/staff/login/page.tsx");
  assert.match(component, /src="\/rio-logo\.png"/);
  assert.match(component, /Vantorstudio Restaurant Platform/);
  assert.match(management, /Management inloggen/);
  assert.match(staff, /Personeel inloggen/);
  assert.match(management, /action=\{managementLogin\}/);
  assert.match(staff, /action=\{dashboardLogin\}/);
  assert.match(component, /type="email"/);
  assert.match(component, /href="\/forgot-password"/);
});

test("password visibility toggle never submits credentials", () => {
  const field = read("src/components/dashboard/PasswordField.tsx");
  assert.match(field, /type="button"/);
  assert.match(field, /aria-label=/);
  assert.match(field, /autoComplete="current-password"/);
  assert.match(field, /name="password"/);
});
