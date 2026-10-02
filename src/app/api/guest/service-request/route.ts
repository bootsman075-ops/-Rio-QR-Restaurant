import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

type RequestType = "service" | "bill";

type GuestServiceRequestBody = {
  token?: unknown;
  requestType?: unknown;
};

function isRequestType(value: unknown): value is RequestType {
  return value === "service" || value === "bill";
}

export async function POST(request: Request) {
  let body: GuestServiceRequestBody;

  try {
    body = (await request.json()) as GuestServiceRequestBody;
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  const requestType = body.requestType;

  if (token.length < 16 || !isRequestType(requestType)) {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: tokenRow, error: tokenError } = await supabase
    .from("qr_tokens")
    .select(
      "restaurant_id, table_id, revoked_at, tables!inner(id, is_active, restaurant_id), restaurants!inner(id, is_active)"
    )
    .eq("token", token)
    .is("revoked_at", null)
    .maybeSingle();

  const tableRecord = Array.isArray(tokenRow?.tables)
    ? tokenRow?.tables[0]
    : tokenRow?.tables;
  const restaurantRecord = Array.isArray(tokenRow?.restaurants)
    ? tokenRow?.restaurants[0]
    : tokenRow?.restaurants;

  if (
    tokenError ||
    !tokenRow ||
    !tableRecord?.is_active ||
    !restaurantRecord?.is_active ||
    tableRecord.restaurant_id !== tokenRow.restaurant_id
  ) {
    return NextResponse.json(
      { error: "QR-code is ongeldig of niet meer actief." },
      { status: 404 }
    );
  }

  const duplicateSince = new Date(Date.now() - 2 * 60 * 1000).toISOString();

  const { data: existing, error: existingError } = await supabase
    .from("service_requests")
    .select("id, request_type, status, created_at")
    .eq("restaurant_id", tokenRow.restaurant_id)
    .eq("table_id", tokenRow.table_id)
    .eq("request_type", requestType)
    .eq("status", "pending")
    .gt("created_at", duplicateSince)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      { error: "Het verzoek kon niet worden gecontroleerd." },
      { status: 500 }
    );
  }

  if (existing) {
    return NextResponse.json(existing, { status: 200 });
  }

  const { data: created, error: createError } = await supabase
    .from("service_requests")
    .insert({
      restaurant_id: tokenRow.restaurant_id,
      table_id: tokenRow.table_id,
      request_type: requestType,
    })
    .select("id, request_type, status, created_at")
    .single();

  if (createError) {
    return NextResponse.json(
      { error: "Het verzoek kon niet worden verstuurd." },
      { status: 500 }
    );
  }

  return NextResponse.json(created, { status: 201 });
}
