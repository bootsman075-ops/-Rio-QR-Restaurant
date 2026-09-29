import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { getSupabasePublishableKey, getSupabaseUrl } from "./env";

/**
 * Supabase client for Server Components, Server Functions and Route Handlers,
 * acting as the signed-in user (subject to Row Level Security).
 * Create a new client per request; never share one across requests.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot set cookies. Safe to ignore once a
            // proxy refreshes the session on each request (added with auth).
          }
        },
      },
    },
  );
}
