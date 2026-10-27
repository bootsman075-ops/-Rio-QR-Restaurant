"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function resetPasswordFromRecoverySession(formData: FormData) {
  const cookieStore = await cookies();
  const recoveryCookie = cookieStore.get("rio_recovery_flow")?.value;

  if (recoveryCookie !== "1") {
    redirect("/forgot-password?error=invalid");
  }

  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirm_password") ?? "");

  if (password.length < 12 || password !== confirmation) {
    redirect("/forgot-password?error=password");
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/forgot-password?error=invalid");
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });

  await supabase.auth.signOut({ scope: "global" });
  cookieStore.delete("rio_recovery_flow");

  if (updateError) {
    redirect("/forgot-password?error=update");
  }

  redirect("/login?reset=success");
}
