import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("create_service_request", {
      p_token: token,
      p_request_type: requestType,
    })
    .maybeSingle();

  if (error || !data) {
    const invalidToken = error?.message?.includes("Invalid or inactive QR token");

    return NextResponse.json(
      {
        error: invalidToken
          ? "QR-code is ongeldig of niet meer actief."
          : "Het verzoek kon niet worden verstuurd.",
      },
      { status: invalidToken ? 404 : 500 },
    );
  }

  return NextResponse.json(
    {
      id: data.request_id,
      request_type: data.request_type,
      status: data.status,
      created_at: data.created_at,
    },
    { status: 200 },
  );
}
