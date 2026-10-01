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

  const { data: platformAdmin } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (platformAdmin) {
    redirect("/platform");
  }

  const { data: membership } = await supabase
    .from("user_restaurants")
    .select("restaurant_id, role")
    .eq("user_id", data.user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    await supabase.auth.signOut();
    redirect("/login?error=access");
  }

  redirect(membership.role === "staff" ? "/staff" : "/management");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
