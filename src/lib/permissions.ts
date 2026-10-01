import "server-only";
import { redirect } from "next/navigation";

import { getStaffContext } from "@/lib/staff-session";
import type { StaffContext, StaffRole } from "@/lib/staff-session";

export type Permission =
  | "requests.handle"
  | "reservations.manage"
  | "reservations.delete"
  | "management.access"
  | "menu.manage";

const STAFF_PERMISSIONS: readonly Permission[] = [
  "requests.handle",
  "reservations.manage",
];

export const ROLE_LABELS: Record<StaffRole, string> = {
  platform_admin: "Platformbeheer",
  restaurant_owner: "Eigenaar",
  manager: "Management",
  staff: "Personeel",
};

export function can(role: StaffRole | null, permission: Permission) {
  if (!role) {
    return false;
  }

  if (
    role === "platform_admin" ||
    role === "restaurant_owner" ||
    role === "manager"
  ) {
    return true;
  }

  return STAFF_PERMISSIONS.includes(permission);
}

function loginPath() {
  return "/login";
}

export async function requirePermissionContext(
  permission: Permission,
): Promise<StaffContext> {
  const context = await getStaffContext();

  if (!context) {
    redirect(loginPath());
  }

  if (!can(context.role, permission)) {
    redirect("/staff");
  }

  return context;
}

export async function requirePermission(permission: Permission) {
  return (await requirePermissionContext(permission)).role;
}
