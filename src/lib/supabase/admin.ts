import { createClient } from "@supabase/supabase-js";
import "server-only";
import type { Database } from "@/types/database.types";

/**
 * Service-role client. Bypasses RLS — only for admin member management
 * (auth.admin.createUser / updateUserById). Never import from client
 * components; never expose SUPABASE_SECRET_KEY to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY. Copy .env.example to .env.local and fill in your Supabase project values.",
    );
  }

  return createClient<Database>(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
