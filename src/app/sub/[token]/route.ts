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
import {
  buildActiveSubscription,
  buildHeaders,
  buildWarningSubscription,
  deviceHash,
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

  // 3) Device tracking (by UA hash)
  const ua = request.headers.get("user-agent");
  const hash = await deviceHash(ua);

  const { data: existingDevice } = await supabase
    .from("devices")
    .select("id")
    .eq("subscription_id", sub.id)
    .eq("device_hash", hash)
    .maybeSingle();

  if (existingDevice) {
    await supabase
      .from("devices")
      .update({ last_seen: new Date().toISOString() })
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

    const info = parseDeviceInfo(ua);
    await supabase.from("devices").insert({
      subscription_id: sub.id,
      device_hash: hash,
      display_name: info.display_name,
      os: info.os,
      client_app: info.client_app,
    });
  }

  // 4) Build the actual subscription
  const body = buildActiveSubscription({ uuid: sub.user_id });
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
