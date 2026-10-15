import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getSupabasePublishableKey, getSupabaseUrl } from "./env";

/** Supabase client for Client Components. Subject to Row Level Security. */
export function createClient() {
  return createBrowserClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
  );
}
