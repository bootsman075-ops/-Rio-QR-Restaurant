import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("successful AAL2 continue route does not fetch the user twice",()=>{
  const src=read("src/app/auth/continue/page.tsx");
  const first=src.indexOf("const context = await getStaffContext()");
  const fallback=src.indexOf("const supabase = await createClient()");
  assert.ok(first >= 0 && fallback > first);
  assert.equal((src.match(/supabase\.auth\.getUser\(\)/g)||[]).length,1);
  assert.match(src,/context\.role === "platform_admin"/);
  assert.match(src,/context\.role === "staff"/);
});

test("management login uses only one Auth call before successful password sign in",()=>{
  const src=read("src/components/dashboard/auth-actions.ts");
  const mgmt=src.slice(src.indexOf("export async function managementLogin"));
  const signin=mgmt.indexOf("supabase.auth.signInWithPassword(");
  const signout=mgmt.indexOf("await supabase.auth.signOut()");
  assert.ok(signin>=0 && signout>signin,"signOut must occur after password attempt, not before");
  assert.match(mgmt,/createAdminClient/);
  assert.match(mgmt,/redirect\("\/management\/login\?error=access"\)/);
  assert.match(mgmt,/redirect\("\/security\/mfa"\)/);
});

test("staff password errors stay on the staff login page",()=>{
  const src=read("src/components/dashboard/auth-actions.ts");
  const page=read("src/app/staff/login/page.tsx");
  assert.match(page,/action=\{staffLogin\}/);
  assert.match(src,/loginWithPassword\(formData, "\/staff\/login"\)/);
  assert.match(src,/redirect\(\`\$\{failurePath\}\?error=credentials\`\)/);
});

test("MFA and tenant security gates are untouched",()=>{
  const src=read("src/lib/staff-session.ts");
  assert.match(src,/currentLevel !== "aal2"/);
  assert.match(src,/\.from\("user_restaurants"\)/);
  assert.match(src,/\.from\("platform_admins"\)/);
});