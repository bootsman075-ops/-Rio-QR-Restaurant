"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import { DASHBOARD_PATHS } from "../areas";
import { requirePermission } from "@/lib/permissions";

export async function markRequestHandled(formData: FormData) {
  await requirePermission("requests.handle");

  const requestId = String(formData.get("request_id") ?? "");

  if (!requestId) {
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !secretKey) {
    throw new Error("Supabase serverconfiguratie ontbreekt.");
  }

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { error } = await supabase
    .from("service_requests")
    .update({
      status: "handled",
      handled_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "pending");

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(DASHBOARD_PATHS.staff.requests);
  revalidatePath(DASHBOARD_PATHS.management.requests);
}
