"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function resetPasswordWithRecoveryToken(formData: FormData) {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirm_password") ?? "");

  // A previously authenticated user must NEVER be sufficient to reset a password.
  if (!/^[A-Za-z0-9_-]{16,512}$/.test(tokenHash)) {
    redirect("/forgot-password?error=invalid");
  }
  if (password.length < 12 || password !== confirmation) {
    redirect("/forgot-password?error=password");
  }

  const supabase = await createClient();
  // The recovery token is bound to this purpose and is consumed by Supabase Auth.
  // Verify it immediately before updating the password, in the SAME request.
  const { data, error: verifyError } = await supabase.auth.verifyOtp({
    type: "recovery",
    token_hash: tokenHash,
  });
  if (verifyError || !data.user || !data.session) {
    redirect("/forgot-password?error=invalid");
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });

  // Always revoke sessions after a recovery attempt. Access JWTs may remain
  // valid until expiry; require short access-token lifetime for sensitive apps.
  await supabase.auth.signOut({ scope: "global" });

  if (updateError) {
    redirect("/forgot-password?error=update");
  }
  redirect("/login?reset=success");
}
