// =============================================================
//   POST /api/cron/sync-traffic
//
//   Called from system cron (curl with Bearer token) every minute
//   to pull used_traffic from Marzban into Supabase.
// =============================================================

import type { NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { syncTrafficFromMarzban } from "@/lib/marzban-sync";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return new Response("CRON_SECRET not configured", { status: 500 });
  }
  const provided = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (provided !== expected) {
    return new Response("Forbidden", { status: 403 });
  }

  const supabase = createAdminClient();
  try {
    const result = await syncTrafficFromMarzban(supabase);
    return Response.json({ ok: true, ...result });
  } catch (e) {
    console.error("[cron sync-traffic] failed:", e);
    return Response.json(
      { ok: false, error: String(e) },
      { status: 500 },
    );
  }
}

// Allow GET for easy debugging from browser/curl with the secret.
export const GET = POST;
