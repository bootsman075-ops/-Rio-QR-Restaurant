import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { STAFF_COOKIE_NAME, getStaffSessionToken } from "@/lib/staff-auth";

/** True when the request carries a valid staff session cookie. */
export async function hasStaffSession() {
  const cookieStore = await cookies();
  const expectedSession = getStaffSessionToken();

  return (
    !!expectedSession &&
    cookieStore.get(STAFF_COOKIE_NAME)?.value === expectedSession
  );
}

/** Redirects to the staff login when there is no valid session. */
export async function requireStaffSession() {
  if (!(await hasStaffSession())) {
    redirect("/staff/login");
  }
}
