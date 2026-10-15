import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const recoveryAction = read("src/app/reset-password/actions.ts");
const invitationAction = read("src/app/auth/set-password/actions.ts");
const forgotPage = read("src/app/forgot-password/page.tsx");
const inviteService = read("src/app/platform/invite-actions.ts");
const recoveryEmail = read("supabase/email-templates/recovery.html");
const invitationEmail = read("supabase/email-templates/invite.html");

test("recovery action checks purpose-specific one-time proof before changing password", () => {
  assert.match(recoveryAction, /verifyOtp\([\s\S]*?type: "recovery"/);
  assert.ok(recoveryAction.indexOf("verifyOtp") < recoveryAction.indexOf("updateUser"));
  assert.doesNotMatch(recoveryAction, /\.getUser\(|\.setSession\(/);
  assert.match(recoveryAction, /token_hash/);
  assert.match(recoveryAction, /signOut\(\{ scope: "global" \}\)/);
});

test("invitation action checks purpose-specific one-time proof before changing password", () => {
  assert.match(invitationAction, /verifyOtp\([\s\S]*?type: "invite"/);
  assert.ok(invitationAction.indexOf("verifyOtp") < invitationAction.indexOf("updateUser"));
  assert.doesNotMatch(invitationAction, /\.getUser\(|\.setSession\(/);
});

test("reset email template sends one-time recovery hash to expected page", () => {
  assert.match(recoveryEmail, /\{\{ \.RedirectTo \}\}\?token_hash=\{\{ \.TokenHash \}\}&amp;type=recovery/);
  assert.match(forgotPage, /\$\{window\.location\.origin\}\/reset-password/);
  assert.doesNotMatch(recoveryEmail, /\{\{ \.ConfirmationURL \}\}/);
});

test("invite template routes to matching account activation page", () => {
  assert.match(invitationEmail, /\{\{ \.RedirectTo \}\}\?token_hash=\{\{ \.TokenHash \}\}&amp;type=invite/);
  assert.match(inviteService, /new URL\("\/auth\/set-password"/);
  assert.doesNotMatch(invitationEmail, /\{\{ \.ConfirmationURL \}\}/);
});

test("never delete an invited user automatically on membership insertion failure", () => {
  assert.doesNotMatch(inviteService, /admin\.auth\.admin\.deleteUser\(/);
});

test("MFA is required before privileged staff access, including a first-time login", () => {
  const staff = read("src/lib/staff-session.ts");
  assert.match(staff, /currentLevel !== "aal2"/);
  assert.match(staff, /redirect\("\/security\/mfa"\)/);
});
