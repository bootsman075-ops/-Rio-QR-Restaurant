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
  | "management.access" // the /management environment
  | "menu.manage"; // dishes, prices, images, allergens, tags, availability, order, categories

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
 * Server-side guard for pages, route handlers and Server Actions.
 * - No session: redirect to the staff login, or to the management login for
 *   management-only permissions.
 * - Session without the permission (staff on a management function):
 *   redirect to /staff.
 */
export async function requirePermission(permission: Permission) {
  const role = await getStaffRole();

  if (!role) {
    redirect(STAFF_PERMISSIONS.includes(permission) ? "/staff/login" : "/management/login");
  }

  if (!can(role, permission)) {
    redirect("/staff");
  }

  return role;
}
