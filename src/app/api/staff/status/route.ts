import { NextResponse } from "next/server";

import { can } from "@/lib/permissions";
import { getStaffContext } from "@/lib/staff-session";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await getStaffContext();

  if (!context || !can(context.role, "requests.handle")) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  if (!context.restaurantId) {
    return NextResponse.json(
      { error: "Geen restaurant geselecteerd" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_requests")
    .select("id, created_at")
    .eq("restaurant_id", context.restaurantId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    count: data?.length ?? 0,
    latestId: data?.[0]?.id ?? null,
  });
}
