// =============================================================
//   Mimzo subscription endpoint:  GET /sub/<token>
//
//   Per-device UUIDs:
//     - First /sub fetch from a device claims a slot in the
//       subscription's devices_limit.
//     - Each device row owns its own Marzban user → unique UUID.
//     - "Удалить устройство" deletes the Marzban user → revokes UUID
//       at xray. Reconnect later requires Happ to re-fetch /sub,
//       which inserts a fresh device row + Marzban user.
// =============================================================

import type { NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  ensureMarzbanUserForDevice,
} from "@/lib/marzban-sync";
import {
  buildActiveSubscription,
  buildHeaders,
  buildWarningSubscription,
  deviceHash,
  isVpnClientUA,
  parseDeviceInfo,
} from "@/lib/sub-content";
import type { Device, Subscription } from "@/types/db";

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

  const { data: sub, error: subErr } = (await supabase
    .from("subscriptions")
    .select("*")
    .eq("sub_token", token)
    .maybeSingle()) as {
    data: Subscription | null;
    error: unknown;
  };
  if (subErr) {
    console.error("[sub] lookup failed", subErr);
    return new Response("Server error", { status: 500 });
  }
  if (!sub) return new Response("Not found", { status: 404 });

  const now = Date.now();
  const expiresAtMs = new Date(sub.expires_at).getTime();
  const expiresAtUnix = Math.floor(expiresAtMs / 1000);
  const trafficTotalBytes = sub.traffic_gb * 1024 ** 3;
  const trafficUsedBytes = Number(sub.traffic_used_bytes);
  const meta = { trafficUsedBytes, trafficTotalBytes, expiresAtUnix };

  if (sub.status === "suspended")
    return warning("Подписка приостановлена. Зайди в кабинет", meta);
  if (sub.status === "expired" || expiresAtMs <= now)
    return warning("Подписка истекла. Продли в кабинете Mimzo", meta);
  if (
    trafficTotalBytes > 0 &&
    trafficUsedBytes >= trafficTotalBytes &&
    sub.traffic_gb < 9999
  )
    return warning("Лимит трафика исчерпан. Докупи в кабинете", meta);

  const ua = request.headers.get("user-agent");
  const h = (name: string) => request.headers.get(name);

  const hwid = h("x-hwid") ?? h("hwid") ?? h("x-device-id");
  const deviceModel = h("x-device-model");
  const deviceOs = h("x-device-os");
  const osVersion = h("x-ver-os");
  const appVersion = h("x-app-version");

  if (process.env.LOG_SUB_HEADERS === "1") {
    const summary: Record<string, string> = {};
    request.headers.forEach((v, k) => (summary[k] = v));
    console.log("[sub] headers:", JSON.stringify(summary));
  }

  if (!isVpnClientUA(ua)) {
    return warning(
      "Открой подписку в приложении (Happ и т.п.), а не в браузере",
      meta,
    );
  }

  const hash = hwid
    ? hwid.toLowerCase().slice(-16).padStart(16, "0")
    : await deviceHash(ua);

  const parsed = parseDeviceInfo(ua);
  const display_name = deviceModel ?? parsed.display_name;
  const os = [deviceOs ?? parsed.os, osVersion].filter(Boolean).join(" ") ||
    null;
  const client_app = appVersion ? `Happ ${appVersion}` : parsed.client_app;

  const { data: existingDevice } = (await supabase
    .from("devices")
    .select("*")
    .eq("subscription_id", sub.id)
    .eq("device_hash", hash)
    .maybeSingle()) as { data: Device | null };

  let deviceRow = existingDevice;
  if (deviceRow) {
    await supabase
      .from("devices")
      .update({
        last_seen: new Date().toISOString(),
        display_name,
        os,
        client_app,
      })
      .eq("id", deviceRow.id);
  } else {
    const { count } = await supabase
      .from("devices")
      .select("*", { count: "exact", head: true })
      .eq("subscription_id", sub.id);
    const used = count ?? 0;
    if (used >= sub.devices_limit) {
      return warning(
        `Лимит устройств (${sub.devices_limit}). Отвяжи лишние в кабинете`,
        meta,
      );
    }

    const insertRes = (await supabase
      .from("devices")
      .insert({
        subscription_id: sub.id,
        device_hash: hash,
        display_name,
        os,
        client_app,
      })
      .select()
      .single()) as { data: Device | null; error: unknown };
    if (insertRes.error || !insertRes.data) {
      console.error("[sub] device insert failed:", insertRes.error);
      return new Response("Server error", { status: 500 });
    }
    deviceRow = insertRes.data;
  }

  // Ensure per-device Marzban user exists with current limits
  let marzbanLinks: string[] | undefined;
  try {
    const { username, links } = await ensureMarzbanUserForDevice({
      deviceHash: hash,
      subscription: sub,
    });
    marzbanLinks = links;
    if (!deviceRow.marzban_username) {
      await supabase
        .from("devices")
        .update({ marzban_username: username })
        .eq("id", deviceRow.id);
    }
  } catch (e) {
    console.error("[sub] marzban provisioning failed:", e);
    return warning(
      "Сервис временно недоступен. Попробуй обновить через минуту",
      meta,
    );
  }

  const body = buildActiveSubscription({
    uuid: sub.user_id,
    marzbanLinks,
  });
  return new Response(body, { headers: buildHeaders(meta) });
}

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
