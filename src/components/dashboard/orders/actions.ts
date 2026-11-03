"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermissionContext } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

const VALID = new Set(["accept","prepare","ready","serve","cancel","mark_paid","mark_unpaid"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function updateOrderAction(formData: FormData) {
  const context = await requirePermissionContext("requests.handle");
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "");
  const area = formData.get("area") === "staff" ? "staff" : "management";
  const destination = area === "staff" ? "/staff/qr-bestellingen" : "/management/qr-bestellingen";
  if (!context.restaurantId || !UUID.test(id) || !VALID.has(action)) {
    redirect(destination + "?error=invalid");
  }
  if ((action === "mark_paid" || action === "mark_unpaid") &&
      context.role !== "manager" && context.role !== "restaurant_owner") {
    redirect(destination + "?error=access");
  }
  const supabase = await createClient();
  const { data: selected } = await supabase.from("qr_orders")
    .select("id").eq("id", id).eq("restaurant_id", context.restaurantId).maybeSingle();
  if (!selected) redirect(destination + "?error=access");
  const { error } = await supabase.rpc("update_qr_order", {
    p_order_id: id, p_action: action,
  });
  if (error) redirect(destination + "?error=update");
  revalidatePath("/management");
  revalidatePath("/staff");
  revalidatePath("/management/qr-bestellingen");
  revalidatePath("/staff/qr-bestellingen");
  redirect(destination);
}
