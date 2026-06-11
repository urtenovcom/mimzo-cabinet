// =============================================================
//   POST /api/ingest/server-metric
//
//   Lightweight agent on each server (bridge/exit/core) posts its
//   own CPU/RAM/load/net once a minute. Auth via X-Metrics-Token so
//   servers never hold the Supabase key.
//
//   Body: { ip, cpu_pct, mem_pct, load1, net_rx_bps, net_tx_bps, conns }
// =============================================================

import type { NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const expected = process.env.METRICS_TOKEN;
  if (!expected) return new Response("METRICS_TOKEN not configured", { status: 500 });
  if (request.headers.get("x-metrics-token") !== expected) {
    return new Response("Forbidden", { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }
  const ip = String(body.ip ?? "").trim();
  if (!ip) return new Response("ip required", { status: 400 });

  const num = (v: unknown) =>
    v === undefined || v === null || v === "" ? null : Number(v);

  const db = createAdminClient();
  const { error } = await db.from("server_metrics").insert({
    ip,
    cpu_pct: num(body.cpu_pct),
    mem_pct: num(body.mem_pct),
    load1: num(body.load1),
    net_rx_bps: num(body.net_rx_bps),
    net_tx_bps: num(body.net_tx_bps),
    conns: num(body.conns),
  });
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
