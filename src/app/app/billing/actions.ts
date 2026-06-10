"use server";

import { revalidatePath } from "next/cache";

import { modifyUser } from "@/lib/marzban";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PromoCode, Subscription } from "@/types/db";

type PromoRow = PromoCode & { grant_devices: number | null };

export interface RedeemPromoResult {
  ok: boolean;
  error?: string;
  applied?: {
    devices_added: number;
    traffic_gb_added: number;
    days_added: number;
  };
}

export async function redeemPromo(
  rawCode: string,
): Promise<RedeemPromoResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Введи промокод" };
  if (!/^[A-Z0-9_-]{2,32}$/.test(code))
    return { ok: false, error: "Неверный формат" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Не авторизован" };

  // Use admin client for promo lookup / counters update — RLS blocks
  // anonymous reads/updates of promo_codes.
  const admin = createAdminClient();

  const { data: promoRow, error: promoErr } = (await admin
    .from("promo_codes")
    .select("*")
    .eq("code", code)
    .eq("is_active", true)
    .maybeSingle()) as { data: PromoRow | null; error: unknown };

  if (promoErr) {
    console.error("[promo] lookup failed:", promoErr);
    return { ok: false, error: "Ошибка сервера" };
  }
  if (!promoRow) return { ok: false, error: "Промокод не найден" };

  // Expiry / usage gates
  if (promoRow.valid_until && new Date(promoRow.valid_until) < new Date()) {
    return { ok: false, error: "Промокод истёк" };
  }
  if (
    promoRow.uses_total !== null &&
    promoRow.uses_count >= promoRow.uses_total
  ) {
    return { ok: false, error: "Промокод исчерпан" };
  }

  // Block double-redemption of the same code by the same user
  const { data: priorUse } = await admin
    .from("payments")
    .select("id")
    .eq("user_id", user.id)
    .eq("provider", "promo")
    .contains("metadata", { promo_code: code })
    .limit(1)
    .maybeSingle();
  if (priorUse) {
    return { ok: false, error: "Этот промокод уже применён" };
  }

  // Take latest subscription
  const { data: sub } = (await admin
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle()) as { data: Subscription | null };

  if (!sub) return { ok: false, error: "Нет активной подписки" };

  // Compute new limits — never downgrade
  const devicesAdded = Math.max(
    0,
    (promoRow.grant_devices ?? 0) - sub.devices_limit,
  );
  const trafficAdded = Math.max(
    0,
    (promoRow.grant_traffic_gb ?? 0) - sub.traffic_gb,
  );
  const daysAdded = promoRow.grant_days ?? 0;

  const newDevicesLimit = Math.max(
    sub.devices_limit,
    promoRow.grant_devices ?? sub.devices_limit,
  );
  const newTrafficGb = Math.max(
    sub.traffic_gb,
    promoRow.grant_traffic_gb ?? sub.traffic_gb,
  );
  const newExpiresAt = new Date(
    Math.max(new Date(sub.expires_at).getTime(), Date.now()) +
      daysAdded * 86400_000,
  );

  // If the sub was expired or expiring imminently, anchor the next
  // traffic reset 30 days from now. Otherwise keep the existing anchor
  // so the user's billing cycle stays predictable.
  const subExpiredMs = new Date(sub.expires_at).getTime();
  const nextResetAt =
    subExpiredMs <= Date.now()
      ? new Date(Date.now() + 30 * 86400_000).toISOString()
      : undefined;

  // Persist subscription update
  const update: Record<string, unknown> = {
    devices_limit: newDevicesLimit,
    traffic_gb: newTrafficGb,
    expires_at: newExpiresAt.toISOString(),
    is_trial: false,
    status: "active",
  };
  if (nextResetAt) update.next_traffic_reset_at = nextResetAt;

  const { error: updErr } = await admin
    .from("subscriptions")
    .update(update)
    .eq("id", sub.id);
  if (updErr) {
    console.error("[promo] sub update failed:", updErr);
    return { ok: false, error: "Не удалось применить" };
  }

  // Sync Marzban limits
  if (sub.marzban_username) {
    try {
      await modifyUser(sub.marzban_username, {
        dataLimitBytes:
          newTrafficGb >= 9999 ? 0 : newTrafficGb * 1024 ** 3,
        expireUnix: Math.floor(newExpiresAt.getTime() / 1000),
        status: "active",
      });
    } catch (e) {
      console.error("[promo] marzban sync failed (non-fatal):", e);
    }
  }

  // Increment promo counter + log to payments for audit trail
  await admin
    .from("promo_codes")
    .update({ uses_count: promoRow.uses_count + 1 })
    .eq("id", promoRow.id);

  await admin.from("payments").insert({
    user_id: user.id,
    provider: "promo",
    amount_rub: 0,
    status: "succeeded",
    purpose: "plan",
    metadata: {
      promo_code: code,
      devices_added: devicesAdded,
      traffic_gb_added: trafficAdded,
      days_added: daysAdded,
    },
  });

  revalidatePath("/app");
  revalidatePath("/app/vpn");
  revalidatePath("/app/billing");

  return {
    ok: true,
    applied: {
      devices_added: devicesAdded,
      traffic_gb_added: trafficAdded,
      days_added: daysAdded,
    },
  };
}
