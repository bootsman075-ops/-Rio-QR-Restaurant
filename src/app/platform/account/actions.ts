"use server";

import { redirect } from "next/navigation";

import { getStaffContext } from "@/lib/staff-session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updatePlatformAdminEmail(formData: FormData) {
  const context = await getStaffContext();

  if (!context) {
    redirect("/login");
  }

  if (context.role !== "platform_admin") {
    redirect(context.role === "staff" ? "/staff" : "/management");
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email || !email.includes("@") || email.length > 254) {
    redirect("/platform/account?error=email");
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(context.userId, {
    email,
    email_confirm: true,
  });

  if (error) {
    redirect("/platform/account?error=update");
  }

  redirect("/platform/account?ok=changed");
}
