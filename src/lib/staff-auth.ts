import { createHmac, timingSafeEqual } from "node:crypto";

/*
 * Two fully separate sessions, each with its own cookie and token:
 *   staff       → rio_staff_session       (STAFF_DASHBOARD_PASSWORD, /staff/login)
 *   management  → rio_management_session  (MANAGER_DASHBOARD_PASSWORD, /management/login)
 *
 * The "-v2" labels invalidate every session issued by earlier versions,
 * including the old shared login where managers signed in via /staff/login.
 * Bump a label to force everyone with that role to sign in again.
 */
export const STAFF_COOKIE_NAME = "rio_staff_session";
export const MANAGEMENT_COOKIE_NAME = "rio_management_session";

/** Cookie of the old shared login; never accepted, only cleared. */
export const LEGACY_MANAGER_COOKIE_NAME = "rio_manager_session";

const STAFF_SESSION_LABEL = "rio-staff-session-v2";
const MANAGEMENT_SESSION_LABEL = "rio-management-session-v2";

function sessionToken(password: string | undefined, label: string) {
  if (!password) {
    return null;
  }

  return createHmac("sha256", password).update(label).digest("hex");
}

function safeEqual(input: string, expected: string | undefined) {
  if (!expected || !input) {
    return false;
  }

  const inputBuffer = Buffer.from(input, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (inputBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(inputBuffer, expectedBuffer);
}

/**
 * True when both passwords are set to the same value. A staff member could
 * then sign in as management, so both logins refuse to work.
 */
export function dashboardPasswordsCollide() {
  const staff = process.env.STAFF_DASHBOARD_PASSWORD;
  const management = process.env.MANAGER_DASHBOARD_PASSWORD;

  return !!staff && !!management && staff === management;
}

export function getStaffSessionToken() {
  return sessionToken(process.env.STAFF_DASHBOARD_PASSWORD, STAFF_SESSION_LABEL);
}

export function isValidStaffPassword(input: string) {
  return safeEqual(input, process.env.STAFF_DASHBOARD_PASSWORD);
}

export function getManagementSessionToken() {
  return sessionToken(process.env.MANAGER_DASHBOARD_PASSWORD, MANAGEMENT_SESSION_LABEL);
}

export function isValidManagementPassword(input: string) {
  return safeEqual(input, process.env.MANAGER_DASHBOARD_PASSWORD);
}
