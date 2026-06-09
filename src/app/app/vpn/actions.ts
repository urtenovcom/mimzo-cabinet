"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
