"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deleteUser as deleteMarzbanUser } from "@/lib/marzban";

export async function removeDevice(deviceId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  // RLS policy "devices_delete_own" already enforces ownership,
  // but we double-check here for clarity.
  const { error } = await supabase.from("devices").delete().eq("id", deviceId);

  if (error) return { error: error.message };

  revalidatePath("/app/vpn");
  revalidatePath("/app");
  return { ok: true };
}

/**
 * Rotate the subscription URL — generates a new token, deletes all devices.
 * Old URL returns 404 instantly. User must re-import on every device.
 */
export async function rotateSubscription() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, marzban_username")
    .eq("user_id", user.id)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub) return { error: "no active subscription" };

  // Wipe Marzban user so the OLD vless URLs (cached in any Happ) become
  // unable to authenticate. On next /sub hit, ensureMarzbanUser will
  // create a fresh one with a brand-new UUID.
  if (sub.marzban_username) {
    try {
      await deleteMarzbanUser(sub.marzban_username);
    } catch (e) {
      console.error("[rotate] marzban delete failed:", e);
    }
  }

  const newToken = randomBytes(16).toString("hex");
  const { error: updateErr } = await supabase
    .from("subscriptions")
    .update({ sub_token: newToken, marzban_username: null })
    .eq("id", sub.id);
  if (updateErr) return { error: updateErr.message };

  await supabase.from("devices").delete().eq("subscription_id", sub.id);

  revalidatePath("/app/vpn");
  revalidatePath("/app");
  return { ok: true, newToken };
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

  const { error } = await supabase
    .from("devices")
    .delete()
    .in("subscription_id", subIds);

  if (error) return { error: error.message };

  revalidatePath("/app/vpn");
  revalidatePath("/app");
  return { ok: true };
}
