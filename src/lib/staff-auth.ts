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
