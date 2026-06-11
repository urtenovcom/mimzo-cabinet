// =============================================================
//   Referral commission — Variant A (credit to internal balance).
//
//   When an invited user makes a successful payment, the referrer
//   receives REFERRAL_PERCENT of it onto their balance_rub, which
//   they can spend on their own subscription. No cash payout.
//
//   Call creditReferralCommission() from the payment-success path
//   once a real payment provider is wired up. Promo "payments"
//   (amount 0) are no-ops.
// =============================================================

import type { SupabaseClient } from "@supabase/supabase-js";

export const REFERRAL_PERCENT = 10;

/**
 * Credits the inviter's balance with REFERRAL_PERCENT of `amountRub`
 * and accumulates it into the referrals ledger. Safe to call for any
 * payment — it quietly returns if the payer has no referrer or the
 * commission rounds to zero.
 */
export async function creditReferralCommission(
  db: SupabaseClient,
  paidUserId: string,
  amountRub: number,
): Promise<{ credited: number; referrerId: string } | null> {
  if (!amountRub || amountRub <= 0) return null;

  const { data: payer } = await db
    .from("profiles")
    .select("referred_by")
    .eq("id", paidUserId)
    .maybeSingle();
  const referrerId = payer?.referred_by as string | null | undefined;
  if (!referrerId) return null;

  const commission = Math.round((amountRub * REFERRAL_PERCENT) / 100);
  if (commission <= 0) return null;

  // 1) credit referrer balance (read-modify-write; fine at current scale)
  const { data: ref } = await db
    .from("profiles")
    .select("balance_rub")
    .eq("id", referrerId)
    .maybeSingle();
  const newBalance = Number(ref?.balance_rub ?? 0) + commission;
  await db.from("profiles").update({ balance_rub: newBalance }).eq("id", referrerId);

  // 2) accumulate into the referral ledger row
  const { data: row } = await db
    .from("referrals")
    .select("id,total_earned_rub")
    .eq("referrer_id", referrerId)
    .eq("referred_id", paidUserId)
    .maybeSingle();
  if (row) {
    await db
      .from("referrals")
      .update({ total_earned_rub: Number(row.total_earned_rub ?? 0) + commission })
      .eq("id", row.id);
  } else {
    await db.from("referrals").insert({
      referrer_id: referrerId,
      referred_id: paidUserId,
      commission_percent: REFERRAL_PERCENT,
      total_earned_rub: commission,
    });
  }

  return { credited: commission, referrerId };
}
