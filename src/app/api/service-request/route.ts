import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RequestType = "service" | "bill";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  const { token, request_type } = body as {
    token?: unknown;
    request_type?: unknown;
  };

  if (
    typeof token !== "string" ||
    token.length < 16 ||
    (request_type !== "service" && request_type !== "bill")
  ) {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("create_service_request", {
    p_token: token,
    p_request_type: request_type as RequestType,
  });

  if (error) {
    return NextResponse.json(
      { error: "Het verzoek kon niet worden verstuurd." },
      { status: 400 },
    );
  }

  return NextResponse.json({ request: data?.[0] ?? null });
}
