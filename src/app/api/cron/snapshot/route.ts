// =============================================================
//   POST /api/cron/snapshot
//
//   System cron (every minute) → one VPN-level metrics row:
//   online users, active devices, bandwidth speed, per-node traffic.
// =============================================================

import type { NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const BASE = process.env.MARZBAN_API_BASE ?? "https://panel.mimzo.ru";

async function marzToken(): Promise<string> {
  const form = new URLSearchParams();
  form.set("username", process.env.MARZBAN_ADMIN_USERNAME ?? "admin");
  form.set("password", process.env.MARZBAN_ADMIN_PASSWORD ?? "");
  form.set("grant_type", "password");
  const r = await fetch(`${BASE}/api/admin/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  return ((await r.json()) as { access_token: string }).access_token;
}

export async function POST(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return new Response("CRON_SECRET not configured", { status: 500 });
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (provided !== expected) return new Response("Forbidden", { status: 403 });

  const db = createAdminClient();
  try {
    const token = await marzToken();
    const auth = { Authorization: `Bearer ${token}` };

    const [sysRes, usageRes] = await Promise.all([
      fetch(`${BASE}/api/system`, { headers: auth, cache: "no-store" }),
      fetch(`${BASE}/api/nodes/usage`, { headers: auth, cache: "no-store" }),
    ]);
    const sys = (await sysRes.json()) as {
      online_users?: number;
      total_user?: number;
      incoming_bandwidth_speed?: number;
      outgoing_bandwidth_speed?: number;
    };
    const usage = (await usageRes.json()) as {
      usages?: { node_name: string; uplink: number; downlink: number }[];
    };
    const nodes: Record<string, number> = {};
    for (const u of usage.usages ?? []) {
      nodes[u.node_name] = Number(u.uplink || 0) + Number(u.downlink || 0);
    }

    // active devices = seen online in the last 90s
    const since = new Date(Date.now() - 90_000).toISOString();
    const { count: activeDevices } = await db
      .from("devices")
      .select("*", { count: "exact", head: true })
      .gte("last_online_at", since);

    await db.from("metrics").insert({
      online_users: sys.online_users ?? null,
      active_devices: activeDevices ?? null,
      total_users: sys.total_user ?? null,
      bw_in_bps: sys.incoming_bandwidth_speed ?? null,
      bw_out_bps: sys.outgoing_bandwidth_speed ?? null,
      nodes,
    });

    return Response.json({ ok: true, online: sys.online_users, active: activeDevices });
  } catch (e) {
    console.error("[cron snapshot] failed:", e);
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export const GET = POST;
