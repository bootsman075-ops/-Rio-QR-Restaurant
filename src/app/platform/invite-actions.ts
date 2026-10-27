"use server";

import { redirect } from "next/navigation";

import { getStaffContext } from "@/lib/staff-session";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_ROLES = new Set(["restaurant_owner", "manager", "staff"]);

function inviteRedirectUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return new URL("/auth/callback?next=/auth/set-password", process.env.NEXT_PUBLIC_APP_URL).toString();
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/auth/callback?next=/auth/set-password`;
  }

  return "http://localhost:3000/auth/callback?next=/auth/set-password";
}

export async function inviteRestaurantUser(formData: FormData) {
  const context = await getStaffContext();

  if (!context || context.role !== "platform_admin") {
    redirect("/login");
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const restaurantId = String(formData.get("restaurant_id") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();

  if (!email || !restaurantId || !ALLOWED_ROLES.has(role)) {
    redirect("/platform?invite=invalid");
  }

  const admin = createAdminClient();
  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id")
    .eq("id", restaurantId)
    .eq("is_active", true)
    .maybeSingle();

  if (!restaurant) {
    redirect("/platform?invite=restaurant");
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: inviteRedirectUrl(),
  });

  if (error || !data.user) {
    redirect("/platform?invite=auth");
  }

  const { error: membershipError } = await admin
    .from("user_restaurants")
    .insert({
      user_id: data.user.id,
      restaurant_id: restaurantId,
      role: role as "restaurant_owner" | "manager" | "staff",
      active: true,
    });

  if (membershipError) {
    await admin.auth.admin.deleteUser(data.user.id);
    redirect("/platform?invite=membership");
  }

  redirect("/platform?invite=sent");
}
