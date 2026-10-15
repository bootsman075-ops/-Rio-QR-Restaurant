"use server";

import { redirect } from "next/navigation";

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
