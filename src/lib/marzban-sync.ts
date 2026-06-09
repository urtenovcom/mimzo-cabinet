// =============================================================
//   Bridges Supabase subscriptions to Marzban users.
//
//   - ensureMarzbanUserForSubscription: lazy provision on first
//     /sub/<token> hit, returns Marzban-issued vless URLs.
//   - syncTrafficFromMarzban: cron-driven pull of used_traffic
//     for every subscription that has a marzban_username.
// =============================================================

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createUser,
  deleteUser,
  getUser,
  listAllUsers,
  modifyUser,
} from "./marzban";
import type { Subscription } from "@/types/db";

/**
 * Derive a stable Marzban username from the Supabase user id.
 * Marzban requires \w{3,32}, so we take 16 hex chars off the UUID.
 */
function deriveUsername(supabaseUserId: string): string {
  const compact = supabaseUserId.replace(/-/g, "");
  return `mimzo_${compact.slice(0, 16)}`;
}

/**
 * Ensure there's a Marzban user matching this subscription and return
 * its current vless links. If the column `marzban_username` doesn't
 * exist yet (pre-migration), returns `undefined` so the caller can
 * fall back to the legacy hardcoded UUID.
 */
export async function ensureMarzbanUserForSubscription(
  supabase: SupabaseClient,
  sub: Subscription & { marzban_username?: string | null },
): Promise<string[] | undefined> {
  let username = sub.marzban_username ?? null;

  if (!username) {
    username = deriveUsername(sub.user_id);

    // Try to persist the username on the subscription row. If the
    // column doesn't exist (migration not yet applied), swallow the
    // error and keep going — we'll create the Marzban user anyway and
    // generate the same username next time.
    const { error: updErr } = await supabase
      .from("subscriptions")
      .update({ marzban_username: username })
      .eq("id", sub.id);

    if (updErr && !/marzban_username/.test(updErr.message ?? "")) {
      console.error("[marzban-sync] persist username failed:", updErr);
    }
  }

  // Ensure user exists in Marzban with our subscription's traffic +
  // expiry limits. We refresh modifyUser on every call to keep limits
  // in sync (cheap, single API hit).
  const dataLimit = sub.traffic_gb >= 9999 ? 0 : sub.traffic_gb * 1024 ** 3;
  const expireUnix = Math.floor(new Date(sub.expires_at).getTime() / 1000);

  let user = await getUser(username);
  if (!user) {
    user = await createUser({
      username,
      dataLimitBytes: dataLimit,
      expireUnix,
    });
  } else {
    // Only push update if something meaningful diverged
    if (
      (user.data_limit ?? 0) !== dataLimit ||
      (user.expire ?? 0) !== expireUnix ||
      user.status !== (sub.status === "active" ? "active" : "disabled")
    ) {
      user = await modifyUser(username, {
        dataLimitBytes: dataLimit,
        expireUnix,
        status: sub.status === "active" ? "active" : "disabled",
      });
    }
  }

  return user.links;
}

/**
 * Pull `used_traffic` from Marzban for every subscription that has
 * a marzban_username. Returns a tally for logging.
 */
export interface TrafficSyncResult {
  scanned: number;
  updated: number;
  errors: number;
}

export async function syncTrafficFromMarzban(
  supabase: SupabaseClient,
): Promise<TrafficSyncResult> {
  // Index all Marzban users by username — one shot, much faster than
  // N lookups for N subscriptions.
  const users = await listAllUsers();
  const byUsername = new Map(users.map((u) => [u.username, u]));

  // Fetch subscriptions that are linked
  const { data: subs, error } = await supabase
    .from("subscriptions")
    .select("id, marzban_username, traffic_used_bytes")
    .not("marzban_username", "is", null);

  if (error) {
    console.error("[marzban-sync] list subs failed:", error);
    return { scanned: 0, updated: 0, errors: 1 };
  }

  let updated = 0;
  let errors = 0;
  for (const row of subs ?? []) {
    const u = byUsername.get(row.marzban_username as string);
    if (!u) continue;
    if (u.used_traffic === Number(row.traffic_used_bytes)) continue;
    const { error: updErr } = await supabase
      .from("subscriptions")
      .update({ traffic_used_bytes: u.used_traffic })
      .eq("id", row.id);
    if (updErr) {
      errors++;
      console.error("[marzban-sync] update failed:", updErr);
    } else {
      updated++;
    }
  }

  return { scanned: subs?.length ?? 0, updated, errors };
}

/**
 * Remove a user from Marzban (used when cabinet user is fully deleted
 * or subscription is permanently revoked).
 */
export async function unprovisionMarzbanUser(username: string): Promise<void> {
  await deleteUser(username);
}
