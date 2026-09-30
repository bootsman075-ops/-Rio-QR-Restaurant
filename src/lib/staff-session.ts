import "server-only";
import { cookies } from "next/headers";
import {
  MANAGER_COOKIE_NAME,
  STAFF_COOKIE_NAME,
  getManagerSessionToken,
  getStaffSessionToken,
} from "@/lib/staff-auth";

export type StaffRole = "manager" | "staff";

/**
 * Role of the current visitor: "manager" when both the staff and manager
 * cookies are valid, "staff" with only the staff cookie, otherwise null.
 * Use requirePermission() from "@/lib/permissions" to guard pages and actions.
 */
export async function getStaffRole(): Promise<StaffRole | null> {
  const cookieStore = await cookies();
  const expectedSession = getStaffSessionToken();

  if (
    !expectedSession ||
    cookieStore.get(STAFF_COOKIE_NAME)?.value !== expectedSession
  ) {
    return null;
  }

  const expectedManager = getManagerSessionToken();

  return expectedManager &&
    cookieStore.get(MANAGER_COOKIE_NAME)?.value === expectedManager
    ? "manager"
    : "staff";
}
