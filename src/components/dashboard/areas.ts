/**
 * The two dashboard environments. Staff and management share the same
 * views; only paths, navigation and permissions differ.
 */
export type DashboardArea = "staff" | "management";

export type DashboardSection = "overview" | "requests" | "reservations" | "menu";

export const DASHBOARD_PATHS = {
  staff: {
    home: "/staff",
    login: "/staff/login",
    requests: "/staff",
    reservations: "/staff/reserveringen",
  },
  management: {
    home: "/management",
    login: "/management/login",
    requests: "/management/tafelverzoeken",
    reservations: "/management/reserveringen",
    menu: "/management/menu",
  },
} as const;

/** Navigation per environment. Add future management modules here. */
export const DASHBOARD_NAV: Record<
  DashboardArea,
  { key: DashboardSection; href: string; label: string }[]
> = {
  staff: [
    { key: "requests", href: DASHBOARD_PATHS.staff.requests, label: "Tafelverzoeken" },
    { key: "reservations", href: DASHBOARD_PATHS.staff.reservations, label: "Reserveringen" },
  ],
  management: [
    { key: "overview", href: DASHBOARD_PATHS.management.home, label: "Overzicht" },
    { key: "requests", href: DASHBOARD_PATHS.management.requests, label: "Tafelverzoeken" },
    { key: "reservations", href: DASHBOARD_PATHS.management.reservations, label: "Reserveringen" },
    { key: "menu", href: DASHBOARD_PATHS.management.menu, label: "Menu beheren" },
  ],
};
