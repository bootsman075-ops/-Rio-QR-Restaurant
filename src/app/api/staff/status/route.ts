import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  STAFF_COOKIE_NAME,
  getStaffSessionToken,
} from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const expectedSession = getStaffSessionToken();

  if (
    !expectedSession ||
    cookieStore.get(STAFF_COOKIE_NAME)?.value !== expectedSession
  ) {
    return NextResponse.json(
      { error: "Niet ingelogd" },
      { status: 401 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    return NextResponse.json(
      { error: "Serverconfiguratie ontbreekt" },
      { status: 500 }
    );
  }

  const supabase = createClient(url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase
    .from("service_requests")
    .select("id, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    count: data?.length ?? 0,
    latestId: data?.[0]?.id ?? null,
  });
}
