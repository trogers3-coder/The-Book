import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Server-only client using the service role key. Every table has RLS
// enabled with no policies, so this is the only key that can read/write
// them — never import this from a Client Component.
export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
    );
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false },
  });
}
