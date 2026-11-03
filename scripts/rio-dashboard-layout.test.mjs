import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");

test("RIO styling is scoped to the Rio restaurant and available on every dashboard route", () => {
  const shell = read("src/app/layout.tsx");
  const theme = read("src/app/management/rio-theme.css");
  assert.match(shell, /import "\.\/management\/rio-theme\.css"/);
  assert.match(theme, /\.rio-management/);
  assert.match(theme, /rio-masthead-logo/);
  assert.match(theme, /\.rio-management :is\(\.request, \.reservation, \.menu-section/);
});

test("the original Rio logo and correct role-specific label appear in every Rio dashboard", () => {
  const header = read("src/components/dashboard/RioDashboardBrand.tsx");
  assert.match(header, /src="\/rio-logo\.png"/);
  assert.match(header, /Managementomgeving/);
  assert.match(header, /Personeelsomgeving/);
  const screens = [
    "src/app/management/page.tsx",
    "src/components/dashboard/requests/RequestsView.tsx",
    "src/components/dashboard/reservations/ReservationsView.tsx",
    "src/components/dashboard/menu/MenuView.tsx",
  ];
  for (const screen of screens) {
    const source = read(screen);
    assert.match(source, /RioDashboardBrand/);
    assert.match(source, /rio-deventer/);
  }
});

test("existing restaurant data and operational actions are preserved", () => {
  const overview = read("src/app/management/page.tsx");
  const requests = read("src/components/dashboard/requests/RequestsView.tsx");
  const reservations = read("src/components/dashboard/reservations/ReservationsView.tsx");
  const menu = read("src/components/dashboard/menu/MenuView.tsx");
  assert.match(overview, /loadOverview\(context\.restaurantId\)/);
  assert.match(requests, /markRequestHandled/);
  assert.match(reservations, /setReservationStatus/);
  assert.match(reservations, /deleteReservation/);
  assert.match(menu, /setMenuItemAvailability/);
  assert.match(menu, /deleteMenuItem/);
  assert.match(menu, /deleteSection/);
});
