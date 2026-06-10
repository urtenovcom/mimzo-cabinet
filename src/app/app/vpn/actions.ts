"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

import { deleteUser as deleteMarzbanUser } from "@/lib/marzban";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function removeDevice(deviceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  // Fetch the device first so we can revoke its Marzban user. Use the
  // user-scoped client — RLS already restricts to the owner.
  const { data: device } = await supabase
    .from("devices")
    .select("id, marzban_username, subscription_id")
    .eq("id", deviceId)
    .maybeSingle();

  if (!device) return { error: "device not found" };

  if (device.marzban_username) {
    try {
      await deleteMarzbanUser(device.marzban_username);
    } catch (e) {
      console.error("[remove-device] marzban delete failed:", e);
      // Continue — even without xray revoke, we still want the row gone
    }
  }

  const { error } = await supabase.from("devices").delete().eq("id", deviceId);
  if (error) return { error: error.message };

  revalidatePath("/app/vpn");
  revalidatePath("/app");
  return { ok: true };
}

export async function removeAllDevices() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  const { data: subs } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id);

  const subIds = (subs ?? []).map((s) => s.id);
  if (subIds.length === 0) return { ok: true };

  // Pull all devices, revoke each one's Marzban user, then delete
  const { data: devices } = await supabase
    .from("devices")
    .select("id, marzban_username")
    .in("subscription_id", subIds);

  for (const d of devices ?? []) {
    if (!d.marzban_username) continue;
    try {
      await deleteMarzbanUser(d.marzban_username);
    } catch (e) {
      console.error("[remove-all] marzban delete failed:", e);
    }
  }

  const { error } = await supabase
    .from("devices")
    .delete()
    .in("subscription_id", subIds);

  if (error) return { error: error.message };

  revalidatePath("/app/vpn");
  revalidatePath("/app");
  return { ok: true };
}

/**
 * Rotate the subscription URL — generates a new token, deletes every
 * device row and every per-device Marzban user. All cached vless URLs
 * on the user's devices become unable to connect.
 */
export async function rotateSubscription() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!sub) return { error: "no active subscription" };

  // Wipe all device-scoped Marzban users
  const admin = createAdminClient();
  const { data: devices } = await admin
    .from("devices")
    .select("marzban_username")
    .eq("subscription_id", sub.id);

  for (const d of devices ?? []) {
    if (!d.marzban_username) continue;
    try {
      await deleteMarzbanUser(d.marzban_username);
    } catch (e) {
      console.error("[rotate] marzban delete failed:", e);
    }
  }

  const newToken = randomBytes(16).toString("hex");
  const { error: updateErr } = await supabase
    .from("subscriptions")
    .update({ sub_token: newToken })
    .eq("id", sub.id);
  if (updateErr) return { error: updateErr.message };

  await supabase.from("devices").delete().eq("subscription_id", sub.id);

  revalidatePath("/app/vpn");
  revalidatePath("/app");
  return { ok: true, newToken };
}
