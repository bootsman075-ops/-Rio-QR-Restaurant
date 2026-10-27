"use server";

import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function dashboardLogin(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=credentials");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    redirect("/login?error=credentials");
  }

  // No role, tenant data or privileged page is accessed until AAL2 is proved.
  // /security/mfa also handles first-time TOTP setup.
  redirect("/security/mfa");
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

  // Replace any existing staff/other session before attempting management login.
  await supabase.auth.signOut();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
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
