// =============================================================
//   Admin access control.
//
//   The owner panel at /admin is gated by an email allowlist
//   in the ADMIN_EMAILS env var (comma-separated). Anyone not
//   on the list gets a 404 — we never reveal /admin exists.
// =============================================================

import { createClient } from "@/lib/supabase/server";

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

/**
 * Returns the authenticated admin's email, or null if the current
 * request is not an authenticated admin. Use in admin server
 * components / actions to gate access.
 */
export async function requireAdmin(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return null;
  return user.email ?? null;
}
