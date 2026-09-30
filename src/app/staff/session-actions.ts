"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { MANAGER_COOKIE_NAME, STAFF_COOKIE_NAME } from "@/lib/staff-auth";

/** Ends the staff or management session, e.g. on a shared tablet. */
export async function logout() {
  const cookieStore = await cookies();

  cookieStore.delete(STAFF_COOKIE_NAME);
  cookieStore.delete(MANAGER_COOKIE_NAME);

  redirect("/staff/login");
}
