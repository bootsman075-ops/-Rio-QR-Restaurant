"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function setInvitedUserPassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (password.length < 12 || password !== confirmPassword) {
    redirect("/auth/set-password?error=password");
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login?error=invite");
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect("/auth/set-password?error=update");
  }

  await supabase.auth.signOut();
  redirect("/login?invited=1");
}
