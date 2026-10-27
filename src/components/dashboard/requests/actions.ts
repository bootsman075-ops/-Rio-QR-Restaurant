"use server";

import { revalidatePath } from "next/cache";

import { DASHBOARD_PATHS } from "../areas";
import { requirePermissionContext } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export async function markRequestHandled(formData: FormData) {
  const context = await requirePermissionContext("requests.handle");

  if (!context.restaurantId) {
    throw new Error("Geen restaurant geselecteerd.");
  }

  const requestId = String(formData.get("request_id") ?? "");

  if (!requestId) {
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("service_requests")
    .update({
      status: "handled",
      handled_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("restaurant_id", context.restaurantId)
    .eq("status", "pending");

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(DASHBOARD_PATHS.staff.requests);
  revalidatePath(DASHBOARD_PATHS.management.requests);
}
