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

  // Platformbeheer is bewust gescheiden van restaurantbeheer.
  if (role === "platform_admin") {
    return false;
  }

  if (role === "restaurant_owner" || role === "manager") {
    return true;
  }

  return STAFF_PERMISSIONS.includes(permission);
}

/** Keep management routes on a management-specific login gateway.
 * A browser has one Supabase session: a staff session must never silently
 * reroute a management link to the staff dashboard.
 */
function managementOnly(permission: Permission): boolean {
  return permission === "management.access"
    || permission === "menu.manage"
    || permission === "reservations.delete";
}

export async function requirePermissionContext(
  permission: Permission,
): Promise<StaffContext> {
  const context = await getStaffContext();

  if (!context) {
    redirect(managementOnly(permission) ? "/management/login" : "/login");
  }

  if (!can(context.role, permission)) {
    if (context.role === "platform_admin") {
      redirect("/platform");
    }
    redirect(managementOnly(permission)
      ? "/management/login?error=access"
      : "/staff");
  }

  return context;
}

export async function requirePermission(permission: Permission) {
  return (await requirePermissionContext(permission)).role;
}
