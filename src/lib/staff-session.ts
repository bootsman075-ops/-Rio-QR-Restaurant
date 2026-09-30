import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  MANAGER_COOKIE_NAME,
  STAFF_COOKIE_NAME,
  getManagerSessionToken,
  getStaffSessionToken,
} from "@/lib/staff-auth";

export type StaffRole = "manager" | "staff";

/** True when the request carries a valid staff session cookie. */
export async function hasStaffSession() {
  return (await getStaffRole()) !== null;
}

/**
 * Role of the current visitor: "manager" when both the staff and manager
 * cookies are valid, "staff" with only the staff cookie, otherwise null.
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

/** Redirects to the staff login when there is no valid session. */
export async function requireStaffSession() {
  const role = await getStaffRole();

  if (!role) {
    redirect("/staff/login");
  }

  return role;
}
