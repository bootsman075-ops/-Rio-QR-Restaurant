"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/staff-session";

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

  // A tab selection changes navigation only, never the authenticated role.
  // A platform administrator still passes the MFA gate in getStaffContext().
  const preferredArea = formData.get("area") === "staff" ? "staff" : "management";
  const context = await getStaffContext();
  if (!context) redirect("/login?error=access");
  if (context.role === "platform_admin") redirect("/platform");
  if (context.role === "staff") redirect("/staff");
  redirect(preferredArea === "staff" ? "/staff" : "/management");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
