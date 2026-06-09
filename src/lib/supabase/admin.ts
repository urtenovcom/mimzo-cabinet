import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client with service-role key.
 * Bypasses RLS — use ONLY in server-side code that needs admin access
 * (subscription endpoint, webhooks, cron jobs).
 *
 * NEVER expose to the client.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
