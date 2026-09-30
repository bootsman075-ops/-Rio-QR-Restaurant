import "server-only";
import { redirect } from "next/navigation";

import { getStaffRole } from "@/lib/staff-session";
import type { StaffRole } from "@/lib/staff-session";

/**
 * Everything a dashboard user can be allowed to do. Add new management
 * features here; management automatically gets every permission.
 */
export type Permission =
  | "requests.handle" // table service and bill requests
  | "reservations.manage" // view, add, edit, change status, cancel
  | "reservations.delete"
  | "menu.manage"; // dishes, prices, images, allergens, availability, order, categories

/** Daily operational permissions for regular staff. */
const STAFF_PERMISSIONS: readonly Permission[] = [
  "requests.handle",
  "reservations.manage",
];

export const ROLE_LABELS: Record<StaffRole, string> = {
  staff: "Personeel",
  manager: "Management",
};

export function can(role: StaffRole | null, permission: Permission) {
  if (!role) {
    return false;
  }

  return role === "manager" || STAFF_PERMISSIONS.includes(permission);
}

/**
 * Server-side guard for pages and Server Actions: sends visitors without a
 * session to the login page and users without the permission to deniedPath.
 */
export async function requirePermission(
  permission: Permission,
  deniedPath = "/staff",
) {
  const role = await getStaffRole();

  if (!role) {
    redirect("/staff/login");
  }

  if (!can(role, permission)) {
    redirect(deniedPath);
  }

  return role;
}
