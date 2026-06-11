// =============================================================
//   Bridges Supabase devices ↔ Marzban users.
//
//   Each *device* gets its own Marzban user (and thus its own
//   vless UUID). Cabinet → Marzban mapping lives on the device row.
//   Removing a device truly revokes that UUID at the xray layer.
//
//   Cron then pulls per-device used_traffic + online_at so the
//   cabinet shows real live status: a device's row reappears
//   automatically when its UUID starts seeing traffic again.
// =============================================================

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createUser,
  DEFAULT_INBOUNDS,
  deleteUser,
  getUser,
  listAllUsers,
  modifyUser,
  resetUserTraffic,
} from "./marzban";
import type { Device, Subscription } from "@/types/db";

const USERNAME_PREFIX = "mimzo_d_";

/**
 * Derive a deterministic Marzban username from the device_hash.
 * device_hash is 16 hex chars (HWID prefix or SHA-256 of UA).
 *
 * We use a *new* random suffix per provisioning so that when a device
 * is removed + later re-added by the same HWID it gets a brand-new
 * UUID — cached vless URLs on the device stop working until Happ
 * refreshes its subscription.
 */
function deriveUsername(deviceHash: string): string {
  return `${USERNAME_PREFIX}${deviceHash.toLowerCase()}`;
}

export interface EnsureDeviceUserInput {
  deviceHash: string;
  subscription: Subscription;
}

/**
 * Make sure a Marzban user exists for this device and that its limits
 * match the parent subscription. Returns the Marzban username and a
 * fresh links[] array (already populated by Marzban with the device
 * UUID + correct host details for every inbound).
 */
export async function ensureMarzbanUserForDevice(input: EnsureDeviceUserInput) {
  const username = deriveUsername(input.deviceHash);

  const dataLimit =
    input.subscription.traffic_gb >= 9999
      ? 0
      : input.subscription.traffic_gb * 1024 ** 3;
  const expireUnix = Math.floor(
    new Date(input.subscription.expires_at).getTime() / 1000,
  );
  const targetStatus =
    input.subscription.status === "active" ? "active" : "disabled";

  let user = await getUser(username);
  if (!user) {
    user = await createUser({
      username,
      dataLimitBytes: dataLimit,
      expireUnix,
    });
  } else {
    // Reconcile every field that might drift — limits, status, and
    // inbound list (new inbounds added to xray after the user was
    // first provisioned would otherwise never reach this user).
    const currentInbounds = user.inbounds?.vless ?? [];
    const inboundsDiverged =
      currentInbounds.length !== DEFAULT_INBOUNDS.length ||
      DEFAULT_INBOUNDS.some((t) => !currentInbounds.includes(t));

    if (
      (user.data_limit ?? 0) !== dataLimit ||
      (user.expire ?? 0) !== expireUnix ||
      user.status !== targetStatus ||
      inboundsDiverged
    ) {
      user = await modifyUser(username, {
        dataLimitBytes: dataLimit,
        expireUnix,
        status: targetStatus,
        inbounds: inboundsDiverged ? DEFAULT_INBOUNDS : undefined,
      });
    }
  }

  return { username, links: orderLinks(user.links) };
}

// Marzban renders inbounds in DB insertion order; we want a fixed
// product-facing order regardless of when an inbound was added.
// Priority — Auto, FI, DE, NL, anything else last.
const ORDER_KEYWORDS = ["Авто", "Финляндия", "Германия", "Нидерланды", "Польша"];

function orderLinks(links: string[]): string[] {
  const indexOf = (link: string) => {
    // The remark sits after `#` in the vless URL, percent-encoded.
    const hashIdx = link.indexOf("#");
    const remark =
      hashIdx >= 0 ? decodeURIComponent(link.slice(hashIdx + 1)) : link;
    for (let i = 0; i < ORDER_KEYWORDS.length; i++) {
      if (remark.includes(ORDER_KEYWORDS[i])) return i;
    }
    return ORDER_KEYWORDS.length;
  };
  return [...links].sort((a, b) => indexOf(a) - indexOf(b));
}

/**
 * Hard-delete a device's Marzban user — drops its UUID from xray's
 * clients[] so any cached vless on the device stops authenticating.
 * Idempotent: 404 is swallowed.
 */
export async function unprovisionDeviceMarzbanUser(
  username: string,
): Promise<void> {
  try {
    await deleteUser(username);
  } catch (e) {
    if (!String(e).includes(" → 404")) throw e;
  }
}

// ── Cron sync ──────────────────────────────────────────────────

export interface TrafficSyncResult {
  scannedSubs: number;
  updatedSubs: number;
  scannedDevices: number;
  updatedDevices: number;
  resetSubs: number;
  errors: number;
}

/**
 * Monthly traffic reset — runs BEFORE we sync usage from Marzban so
 * the just-reset subs don't immediately get last cycle's counter
 * back. For each subscription where:
 *   - next_traffic_reset_at <= now()
 *   - expires_at > now()   (subscription is still paid for)
 * We:
 *   1) Reset every device's Marzban user via POST /api/user/{u}/reset
 *   2) Set subscription.traffic_used_bytes = 0
 *   3) Advance next_traffic_reset_at by 30 days
 */
async function rolloverDueSubscriptions(
  supabase: SupabaseClient,
): Promise<{ reset: number; errors: number }> {
  const nowIso = new Date().toISOString();

  const { data: due, error } = await supabase
    .from("subscriptions")
    .select("id, next_traffic_reset_at, expires_at")
    .lte("next_traffic_reset_at", nowIso)
    .gt("expires_at", nowIso);

  if (error) {
    console.error("[traffic-reset] list due failed:", error);
    return { reset: 0, errors: 1 };
  }
  if (!due || due.length === 0) return { reset: 0, errors: 0 };

  let reset = 0;
  let errors = 0;

  for (const sub of due) {
    // Each device for this sub has its own Marzban user — wipe each
    const { data: devs } = await supabase
      .from("devices")
      .select("marzban_username")
      .eq("subscription_id", sub.id)
      .not("marzban_username", "is", null);

    for (const d of devs ?? []) {
      if (!d.marzban_username) continue;
      try {
        await resetUserTraffic(d.marzban_username);
      } catch (e) {
        console.error("[traffic-reset] marzban reset failed:", e);
        errors++;
      }
    }

    // Advance the cycle by 30 days. Use the previously stored anchor
    // (not now()) so the reset day stays aligned with purchase day
    // even if cron lagged.
    const nextAnchor = new Date(
      new Date(sub.next_traffic_reset_at as string).getTime() +
        30 * 86400_000,
    );

    const { error: updErr } = await supabase
      .from("subscriptions")
      .update({
        traffic_used_bytes: 0,
        next_traffic_reset_at: nextAnchor.toISOString(),
      })
      .eq("id", sub.id);

    if (updErr) {
      errors++;
      console.error("[traffic-reset] update sub failed:", updErr);
    } else {
      reset++;
    }
  }

  return { reset, errors };
}

/**
 * One cron pass:
 *   0) Roll over any subscriptions whose monthly anchor is due
 *   1) Snapshot all Marzban users (one HTTP call)
 *   2) For every linked device: bump last_online_at if newer in Marzban
 *   3) Aggregate used_traffic per subscription, write back
 */
export async function syncTrafficFromMarzban(
  supabase: SupabaseClient,
): Promise<TrafficSyncResult> {
  const rollover = await rolloverDueSubscriptions(supabase);
  const users = await listAllUsers();
  const byUsername = new Map(users.map((u) => [u.username, u]));

  const { data: devices, error: devErr } = (await supabase
    .from("devices")
    .select("id, subscription_id, marzban_username, last_online_at")
    .not("marzban_username", "is", null)) as {
    data:
      | Pick<
          Device,
          "id" | "subscription_id" | "marzban_username" | "last_online_at"
        >[]
      | null;
    error: unknown;
  };

  if (devErr) {
    console.error("[marzban-sync] list devices failed:", devErr);
    return {
      scannedSubs: 0,
      updatedSubs: 0,
      scannedDevices: 0,
      updatedDevices: 0,
      resetSubs: rollover.reset,
      errors: 1 + rollover.errors,
    };
  }

  const trafficBySub = new Map<string, number>();
  let scannedDevices = 0;
  let updatedDevices = 0;
  let errors = 0;

  for (const d of devices ?? []) {
    if (!d.marzban_username) continue;
    const u = byUsername.get(d.marzban_username);
    if (!u) continue;
    scannedDevices++;

    trafficBySub.set(
      d.subscription_id,
      (trafficBySub.get(d.subscription_id) ?? 0) + u.used_traffic,
    );

    // Refresh last_online_at when Marzban reports a newer timestamp
    if (
      u.online_at &&
      (!d.last_online_at ||
        new Date(u.online_at).getTime() >
          new Date(d.last_online_at).getTime())
    ) {
      const { error } = await supabase
        .from("devices")
        .update({ last_online_at: u.online_at })
        .eq("id", d.id);
      if (error) errors++;
      else updatedDevices++;
    }
  }

  let updated = 0;
  for (const [subId, total] of trafficBySub) {
    const { error: updErr } = await supabase
      .from("subscriptions")
      .update({ traffic_used_bytes: total })
      .eq("id", subId);
    if (updErr) {
      errors++;
      console.error("[marzban-sync] update sub failed:", updErr);
    } else {
      updated++;
    }
  }

  return {
    scannedSubs: trafficBySub.size,
    updatedSubs: updated,
    scannedDevices,
    updatedDevices,
    resetSubs: rollover.reset,
    errors: errors + rollover.errors,
  };
}
