// =============================================================
//   Mimzo subscription endpoint:  GET /sub/<token>
//
//   Resolves <token> → subscription row in Supabase, enforces
//   status / expiry / device-limit, registers the calling device
//   (by UA hash), and returns the base64 Happ bundle with our
//   current VPN servers + routing profile.
// =============================================================

import type { NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { ensureMarzbanUserForSubscription } from "@/lib/marzban-sync";
import {
  buildActiveSubscription,
  buildHeaders,
  buildWarningSubscription,
  deviceHash,
  isVpnClientUA,
  parseDeviceInfo,
} from "@/lib/sub-content";
import type { Subscription } from "@/types/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Params {
  params: Promise<{ token: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const { token } = await params;

  if (!/^[a-f0-9]{32}$/.test(token)) {
    return new Response("Not found", { status: 404 });
  }

  const supabase = createAdminClient();

  // 1) Find the subscription
  const { data: sub, error } = (await supabase
    .from("subscriptions")
    .select("*")
    .eq("sub_token", token)
    .maybeSingle()) as {
    data: Subscription | null;
    error: unknown;
  };

  if (error) {
    console.error("sub lookup failed", error);
    return new Response("Server error", { status: 500 });
  }
  if (!sub) {
    return new Response("Not found", { status: 404 });
  }

  // 2) Status / expiry gates
  const now = Date.now();
  const expiresAtMs = new Date(sub.expires_at).getTime();
  const expiresAtUnix = Math.floor(expiresAtMs / 1000);
  const trafficTotalBytes = sub.traffic_gb * 1024 ** 3;
  const trafficUsedBytes = Number(sub.traffic_used_bytes);

  if (sub.status === "suspended") {
    return warning("Подписка приостановлена. Зайди в кабинет", {
      trafficUsedBytes,
      trafficTotalBytes,
      expiresAtUnix,
    });
  }
  if (sub.status === "expired" || expiresAtMs <= now) {
    return warning("Подписка истекла. Продли в кабинете Mimzo", {
      trafficUsedBytes,
      trafficTotalBytes,
      expiresAtUnix,
    });
  }
  if (
    trafficTotalBytes > 0 &&
    trafficUsedBytes >= trafficTotalBytes &&
    sub.traffic_gb < 9999
  ) {
    return warning("Лимит трафика исчерпан. Докупи в кабинете", {
      trafficUsedBytes,
      trafficTotalBytes,
      expiresAtUnix,
    });
  }

  // 3) Device tracking — ONLY for real VPN clients.
  const ua = request.headers.get("user-agent");
  const h = (name: string) => request.headers.get(name);

  // Happ packs device metadata into custom headers — prefer those.
  const hwid = h("x-hwid") ?? h("hwid") ?? h("x-device-id");
  const deviceModel = h("x-device-model"); // e.g. "iPhone 14 Pro"
  const deviceOs = h("x-device-os"); // e.g. "iOS"
  const osVersion = h("x-ver-os"); // e.g. "26.5"
  const appVersion = h("x-app-version"); // e.g. "4.11.0"

  if (process.env.LOG_SUB_HEADERS === "1") {
    const summary: Record<string, string> = {};
    request.headers.forEach((v, k) => {
      summary[k] = v;
    });
    console.log("[sub] headers:", JSON.stringify(summary));
  }

  if (isVpnClientUA(ua)) {
    // HWID is the most stable identifier — use it when Happ provides one.
    const hash = hwid
      ? hwid.toLowerCase().slice(-16).padStart(16, "0")
      : await deviceHash(ua);

    // Build the richest display we can from Happ headers (fallback to UA parse)
    const parsed = parseDeviceInfo(ua);
    const display_name = deviceModel ?? parsed.display_name;
    const os = [deviceOs ?? parsed.os, osVersion].filter(Boolean).join(" ") ||
      null;
    const client_app = appVersion
      ? `Happ ${appVersion}`
      : parsed.client_app;

    const { data: existingDevice } = await supabase
      .from("devices")
      .select("id")
      .eq("subscription_id", sub.id)
      .eq("device_hash", hash)
      .maybeSingle();

    if (existingDevice) {
      await supabase
        .from("devices")
        .update({
          last_seen: new Date().toISOString(),
          display_name,
          os,
          client_app,
        })
        .eq("id", existingDevice.id);
    } else {
      const { count } = await supabase
        .from("devices")
        .select("*", { count: "exact", head: true })
        .eq("subscription_id", sub.id);

      const used = count ?? 0;
      if (used >= sub.devices_limit) {
        return warning(
          `Лимит устройств (${sub.devices_limit}). Отвяжи лишние в кабинете`,
          { trafficUsedBytes, trafficTotalBytes, expiresAtUnix },
        );
      }

      const { error: insertErr } = await supabase.from("devices").insert({
        subscription_id: sub.id,
        device_hash: hash,
        display_name,
        os,
        client_app,
      });
      if (insertErr) {
        console.error("[sub] device insert failed:", insertErr);
      }
    }
  }

  // 4) Lazily provision a Marzban user for this subscription and fetch
  //    the real per-user vless links. Falls back to legacy shared UUID
  //    if Marzban is unreachable.
  let marzbanLinks: string[] | undefined;
  try {
    marzbanLinks = await ensureMarzbanUserForSubscription(supabase, sub);
  } catch (e) {
    console.error("[sub] marzban provisioning failed, using fallback:", e);
  }

  // 5) Build the actual subscription
  const body = buildActiveSubscription({
    uuid: sub.user_id,
    marzbanLinks,
  });
  return new Response(body, {
    headers: buildHeaders({
      trafficUsedBytes,
      trafficTotalBytes,
      expiresAtUnix,
    }),
  });
}

// ── helpers ───────────────────────────────────────────────────

function warning(
  message: string,
  meta: {
    trafficUsedBytes: number;
    trafficTotalBytes: number;
    expiresAtUnix: number;
  },
) {
  return new Response(buildWarningSubscription(message), {
    headers: buildHeaders(meta),
  });
}
