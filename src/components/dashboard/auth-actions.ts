"use server";

import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function loginWithPassword(formData: FormData, failurePath: "/login" | "/staff/login") {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(`${failurePath}?error=credentials`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    redirect(`${failurePath}?error=credentials`);
  }

  // The server checks the authenticated user's role. Staff proceeds at AAL1;
  // management and platform accounts are sent to MFA by getStaffContext.
  redirect("/auth/continue");
}

export async function dashboardLogin(formData: FormData) {
  await loginWithPassword(formData, "/login");
}

export async function staffLogin(formData: FormData) {
  await loginWithPassword(formData, "/staff/login");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}


export async function managementLogin(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/management/login?error=credentials");
  }

  const supabase = await createClient();

  // A successful signInWithPassword replaces the existing Supabase session.
  // Do not revoke a session before we know whether the credentials are valid:
  // it adds an unnecessary Auth call and can trigger stale-session errors.
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    // Preserve the former failure behavior: an unsuccessful attempt leaves
    // no prior staff session active on the management login screen.
    await supabase.auth.signOut();
    redirect("/management/login?error=credentials");
  }

  // Verify that this exact authenticated user owns an active management role.
  const admin = createAdminClient();
  const { data: membership, error: membershipError } = await admin
    .from("user_restaurants")
    .select("role, active")
    .eq("user_id", data.user.id)
    .eq("active", true)
    .in("role", ["restaurant_owner", "manager"])
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    await supabase.auth.signOut();
    redirect("/management/login?error=access");
  }

  redirect("/security/mfa");
}
