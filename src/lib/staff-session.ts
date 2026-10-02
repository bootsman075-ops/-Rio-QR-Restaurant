import "server-only";

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

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export async function getStaffContext(): Promise<StaffContext | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

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

  const { data: membership, error: membershipError } = await supabase
    .from("user_restaurants")
    .select(
      "restaurant_id, role, restaurants!inner(name, slug, is_active)"
    )
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    return null;
  }

  const restaurant = firstRelation(membership.restaurants);

  if (!restaurant?.is_active) {
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
}

export async function getStaffRole(): Promise<StaffRole | null> {
  return (await getStaffContext())?.role ?? null;
}
