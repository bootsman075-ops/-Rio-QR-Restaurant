import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const action = readFileSync("src/app/reserveren/[slug]/actions.ts", "utf8");
const page = readFileSync("src/app/reserveren/[slug]/page.tsx", "utf8");
const ui = readFileSync("src/app/reserveren/[slug]/BookingExperience.tsx", "utf8");
const css = readFileSync("src/app/reserveren/[slug]/booking.css", "utf8");
const qr = readFileSync("src/app/qr/[token]/page.tsx", "utf8");

test("public booking accepts requests only for Rio, never arbitrary tenant IDs", () => {
  assert.match(action, /readText\(formData, "restaurant_slug"\) !== RIO_SLUG/);
  assert.match(action, /\.eq\("slug", RIO_SLUG\)/);
  assert.match(action, /\.eq\("is_active", true\)/);
  assert.doesNotMatch(action, /readText\(formData, "restaurant_id"\)/);
});
test("server validates date, party size, identity and bot trap", () => {
  for (const pattern of [/isValidDate\(date\)/, /isValidTime\(time\)/, /partySize > 12/, /guestName\.length/, /email\.length/, /phone\.length/, /readText\(formData, "website"\)/, /addDays\(today, 90\)/]) assert.match(action, pattern);
});
test("server writes only pending requests and checks duplicates first", () => {
  assert.match(action, /\.from\("reservations"\)\.insert\(/);
  assert.match(action, /status: "pending"/);
  assert.match(action, /guest_email: email/);
  assert.match(action, /const \{ data: duplicate, error: duplicateError \}/);
  assert.doesNotMatch(action, /status: "confirmed"/);
});
test("guest UI is disabled without database and does not claim confirmation", () => {
  assert.match(page, /bookingEnabled = false/);
  assert.match(ui, /disabled=\{!bookingEnabled/);
  assert.match(ui, /geen gegarandeerde beschikbaarheid/);
  assert.match(action, /pas definitief na bevestiging/);
});
test("design is responsive and accessible", () => {
  assert.match(css, /@media \(max-width: 480px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(ui, /aria-label="Datum"/);
  assert.match(ui, /role="alert"/);
});
test("QR entry exposes Rio booking without affecting other tenants", () => {
  assert.match(qr, /table.restaurant_slug === "rio-deventer"/);
  assert.match(qr, /reserveren\//);
});


test("reservation QR greeting requires explicit guest opt-in and no public reservation read", () => {
  assert.match(action, /formData.get\("show_name_on_table_qr"\) === "on"/);
  assert.match(action, /show_name_on_table_qr: showNameOnTableQr/);
  assert.match(ui, /type="checkbox" name="show_name_on_table_qr"/);
  assert.match(qr, /rpc\("resolve_qr_reservation_greeting"/);
  assert.doesNotMatch(qr, /createAdminClient/);
});

test("shared login has management and staff switch without altering role enforcement", () => {
  const login = readFileSync("src/components/dashboard/LoginCard.tsx", "utf8");
  const session = readFileSync("src/lib/staff-session.ts", "utf8");
  const nav = readFileSync("src/components/dashboard/DashboardNav.tsx", "utf8");
  assert.match(login, /Kies je omgeving/);
  assert.match(login, /Personeel/);
  assert.match(login, /Management/);
  assert.match(nav, /Wissel tussen Management en Personeel/);
  assert.match(session, /platform_admin/);
});
