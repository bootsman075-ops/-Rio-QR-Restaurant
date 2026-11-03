import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type OrderBody = {
  token?: unknown;
  clientRequestId?: unknown;
  items?: unknown;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(request: Request) {
  let body: OrderBody;
  try {
    if (Number(request.headers.get("content-length") ?? "0") > 5000) {
      return NextResponse.json({ error: "Bestelling is te groot." }, { status: 413 });
    }
    body = await request.json() as OrderBody;
  } catch {
    return NextResponse.json({ error: "Ongeldige bestelling." }, { status: 400 });
  }
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (token.length < 16 || token.length > 128 ||
      typeof body.clientRequestId !== "string" || !UUID.test(body.clientRequestId) ||
      !Array.isArray(body.items) || body.items.length < 1 || body.items.length > 30 ||
      body.items.some((item: unknown) => {
        if (!item || typeof item !== "object") return true;
        const line = item as { id?: unknown; quantity?: unknown };
        return typeof line.id !== "string" || !UUID.test(line.id) ||
          !Number.isInteger(line.quantity) || Number(line.quantity) < 1 ||
          Number(line.quantity) > 20;
      })) {
    return NextResponse.json({ error: "Controleer de gekozen gerechten." }, { status: 400 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_qr_order", {
    p_token: token,
    p_client_request_id: body.clientRequestId,
    p_items: body.items as { id: string; quantity: number }[],
  });
  if (error || !data || typeof data !== "object" || Array.isArray(data) ||
      !("id" in data)) {
    const msg = error?.message || "";
    const invalid = /invalid_qr_token|unavailable_menu_item|invalid_order_|invalid_quantity/.test(msg);
    const limited = /order_rate_limit/.test(msg);
    return NextResponse.json({
      error: limited ? "Er zijn kort na elkaar te veel bestellingen geplaatst. Probeer het later opnieuw." :
        invalid ? "Deze QR-code of één van de gerechten is niet meer beschikbaar." :
        "Bestelling kon niet worden opgeslagen. Probeer het opnieuw.",
    }, { status: limited ? 429 : invalid ? 400 : 503 });
  }
  return NextResponse.json({
    id: data.id,
    total_cents: data.total_cents,
    status: data.status,
  }, { headers: { "Cache-Control": "no-store" } });
}
