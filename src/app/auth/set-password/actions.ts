"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function setInvitedUserPassword(formData: FormData) {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirm_password") ?? "");

  if (!/^[A-Za-z0-9_-]{16,512}$/.test(tokenHash)) {
    redirect("/login?error=invite");
  }
  if (password.length < 12 || password !== confirmation) {
    redirect("/login?error=invite");
  }

  const supabase = await createClient();
  // Only a validated one-time invitation grants permission to set a password.
  // A pre-existing, possibly AAL1, session does not grant this permission.
  const { data, error: verifyError } = await supabase.auth.verifyOtp({
    type: "invite",
    token_hash: tokenHash,
  });

  if (verifyError || !data.user || !data.session) {
    redirect("/login?error=invite");
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });
  await supabase.auth.signOut({ scope: "global" });
  if (updateError) {
    redirect("/login?error=invite");
  }

  redirect("/login?invited=1");
}
