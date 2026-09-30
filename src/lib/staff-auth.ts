import { createHmac, timingSafeEqual } from "node:crypto";

export const STAFF_COOKIE_NAME = "rio_staff_session";

export function getStaffSessionToken() {
  const password = process.env.STAFF_DASHBOARD_PASSWORD;

  if (!password) {
    return null;
  }

  return createHmac("sha256", password)
    .update("rio-staff-session-v1")
    .digest("hex");
}

export function isValidStaffPassword(input: string) {
  const expected = process.env.STAFF_DASHBOARD_PASSWORD;

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

// Managers get the regular staff cookie plus this one, so every existing
// staff check keeps working unchanged for them.
export const MANAGER_COOKIE_NAME = "rio_manager_session";

export function getManagerSessionToken() {
  const password = process.env.MANAGER_DASHBOARD_PASSWORD;

  if (!password) {
    return null;
  }

  return createHmac("sha256", password)
    .update("rio-manager-session-v1")
    .digest("hex");
}

export function isValidManagerPassword(input: string) {
  const expected = process.env.MANAGER_DASHBOARD_PASSWORD;

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
