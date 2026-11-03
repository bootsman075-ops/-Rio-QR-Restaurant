import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

export type RestaurantRole = Enums<"restaurant_user_role">;
export type StaffRole = "platform_admin" | RestaurantRole;

export type StaffContext = {
  userId: string;
  email: string | null;
  role: StaffRole;
  restaurantId: string | null;
  restaurantName: string | null;
  restaurantSlug: string | null;
};

// React cache is scoped to ONE server request, never shared across users.
// It removes repeat Auth/MFA/tenant fetches when a dashboard and its nav render.
export const getStaffContext = cache(async function getStaffContext(): Promise<StaffContext | null> {
  const supabase = await createClient();

  // getUser validates the session with the Auth server, unlike getSession.
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: assurance, error: assuranceError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  // Staff is explicitly allowed AAL1, but all managers, restaurant owners
  // and platform administrators continue to require verified MFA (AAL2).
  if (assuranceError || !assurance ||
      (assurance.currentLevel !== "aal1" && assurance.currentLevel !== "aal2")) {
    redirect("/security/mfa");
  }
  const hasVerifiedMfa = assurance.currentLevel === "aal2";

  if (hasVerifiedMfa) {
    const { data: platformAdmin } = await supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (platformAdmin) {
      return {
        userId: user.id,
        email: user.email ?? null,
        role: "platform_admin",
        restaurantId: null,
        restaurantName: null,
        restaurantSlug: null,
      };
    }
  }

  // The read-only RLS exception only exposes the current user's OWN active
  // membership at AAL1. Never use a privileged admin client for this check.
  const { data: membership, error: membershipError } = await supabase
    .from("user_restaurants")
    .select("restaurant_id, role")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (membershipError) return null;
  if (!membership) {
    if (!hasVerifiedMfa) redirect("/security/mfa");
    return null;
  }

  if (assurance.currentLevel !== "aal2" && membership.role !== "staff") {
    redirect("/security/mfa");
  }

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("name, slug, is_active")
    .eq("id", membership.restaurant_id)
    .maybeSingle();

  if (restaurantError || !restaurant?.is_active) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    role: membership.role,
    restaurantId: membership.restaurant_id,
    restaurantName: restaurant.name,
    restaurantSlug: restaurant.slug,
  };
});

export async function getStaffRole(): Promise<StaffRole | null> {
  return (await getStaffContext())?.role ?? null;
}
