import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getSupabaseSecretKey, getSupabaseUrl } from "./env";

/**
 * Privileged Supabase client using the secret key. BYPASSES Row Level
 * Security — use only in trusted server code (e.g. resolving a QR token,
 * seeding, admin tasks) and always scope queries by restaurant_id yourself.
 */
export function createAdminClient() {
  return createClient<Database>(getSupabaseUrl(), getSupabaseSecretKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
