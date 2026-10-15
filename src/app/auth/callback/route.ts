import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Never redirect to a user-controlled origin or arbitrary authenticated route.
// These destinations are deliberately limited to account activation and recovery.
const ALLOWED_DESTINATIONS = new Set([
  "/auth/set-password",
  "/reset-password",
]);

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "";

  if (!code || !ALLOWED_DESTINATIONS.has(next)) {
    return NextResponse.redirect(new URL("/login?error=invite", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login?error=invite", url.origin));
  }

  const response = NextResponse.redirect(new URL(next, url.origin));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
