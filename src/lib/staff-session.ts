import "server-only";
import { cookies } from "next/headers";
import {
  MANAGEMENT_COOKIE_NAME,
  STAFF_COOKIE_NAME,
  getManagementSessionToken,
  getStaffSessionToken,
} from "@/lib/staff-auth";

export type StaffRole = "manager" | "staff";

/**
 * Role of the current visitor, from two independent session cookies:
 * a valid management cookie → "manager", otherwise a valid staff cookie →
 * "staff", otherwise null. A staff cookie never grants management, and
 * cookies from earlier versions (old token labels, rio_manager_session)
 * are never accepted.
 * Use requirePermission() from "@/lib/permissions" to guard pages and actions.
 */
export async function getStaffRole(): Promise<StaffRole | null> {
  const cookieStore = await cookies();

  const expectedManagement = getManagementSessionToken();

  if (
    expectedManagement &&
    cookieStore.get(MANAGEMENT_COOKIE_NAME)?.value === expectedManagement
  ) {
    return "manager";
  }

  const expectedStaff = getStaffSessionToken();

  if (
    expectedStaff &&
    cookieStore.get(STAFF_COOKIE_NAME)?.value === expectedStaff
  ) {
    return "staff";
  }

  return null;
}
