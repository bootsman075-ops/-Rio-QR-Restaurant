"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  LEGACY_MANAGER_COOKIE_NAME,
  MANAGEMENT_COOKIE_NAME,
  STAFF_COOKIE_NAME,
  dashboardPasswordsCollide,
  getManagementSessionToken,
  getStaffSessionToken,
  isValidManagementPassword,
  isValidStaffPassword,
} from "@/lib/staff-auth";
import { getStaffRole } from "@/lib/staff-session";

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 12,
};

async function clearAllSessions() {
  const cookieStore = await cookies();

  cookieStore.delete(STAFF_COOKIE_NAME);
  cookieStore.delete(MANAGEMENT_COOKIE_NAME);
  cookieStore.delete(LEGACY_MANAGER_COOKIE_NAME);

  return cookieStore;
}

/** /staff/login — accepts only STAFF_DASHBOARD_PASSWORD. */
export async function staffLogin(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const token = getStaffSessionToken();

  if (!token || dashboardPasswordsCollide()) {
    redirect("/staff/login?error=config");
  }

  if (!isValidStaffPassword(password)) {
    redirect("/staff/login?error=1");
  }

  // One active role per browser: a staff login ends any management session.
  const cookieStore = await clearAllSessions();
  cookieStore.set(STAFF_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);

  redirect("/staff");
}

/** /management/login — accepts only MANAGER_DASHBOARD_PASSWORD. */
export async function managementLogin(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const token = getManagementSessionToken();

  if (!token || dashboardPasswordsCollide()) {
    redirect("/management/login?error=config");
  }

  if (!isValidManagementPassword(password)) {
    redirect("/management/login?error=1");
  }

  const cookieStore = await clearAllSessions();
  cookieStore.set(MANAGEMENT_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);

  redirect("/management");
}

/** Ends every dashboard session and returns to the login of the same role. */
export async function logout() {
  const role = await getStaffRole();

  await clearAllSessions();

  redirect(role === "manager" ? "/management/login" : "/staff/login");
}
