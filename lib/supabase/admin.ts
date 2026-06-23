// Service-role Supabase client. BYPASSES RLS. Server-only.
//
// The `server-only` import makes the build fail if this module is ever pulled
// into a Client Component bundle, so the service-role key can never ship to the
// browser. Used exclusively by moderation code (banning + the signup denylist),
// never for normal user requests.
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // New Supabase secret key (sb_secret_…), falling back to the legacy
  // service_role JWT. Either bypasses RLS — server-only, never shipped.
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Service role not configured. Set SUPABASE_SECRET_KEY (server-only).",
    );
  }

  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
