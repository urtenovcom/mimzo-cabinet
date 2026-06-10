import { ReceiptText, Sparkles } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatDateShort, formatRub } from "@/lib/format";
import type { Payment, Profile } from "@/types/db";

import { PromoForm } from "./promo-form";
import { TopupBlock } from "./topup-block";

const PAYMENT_PURPOSE_LABEL: Record<string, string> = {
  plan: "Покупка тарифа",
  extra_device: "Дополнительное устройство",
  extra_traffic: "Дополнительный трафик",
  topup: "Пополнение баланса",
  referral_payout: "Реферальное начисление",
  correction: "Корректировка",
};

const PAYMENT_STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pending: { label: "Ожидается", className: "text-amber-400" },
  succeeded: { label: "Успешно", className: "text-emerald-400" },
  cancelled: { label: "Отменено", className: "text-muted-foreground" },
  failed: { label: "Ошибка", className: "text-red-400" },
};

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = (await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .maybeSingle()) as { data: Profile | null };

  const { data: payments } = (await supabase
    .from("payments")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(20)) as { data: Payment[] | null };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Финансы
        </h1>
        <p className="text-sm text-muted-foreground">
          Баланс, история, промокоды.
        </p>
      </header>

      {/* Balance */}
      <Card>
        <CardHeader>
          <CardDescription>Текущий баланс</CardDescription>
          <CardTitle className="text-3xl tabular-nums">
            {formatRub(profile?.balance_rub ?? 0)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TopupBlock />
        </CardContent>
      </Card>

      {/* Promo code */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg inline-flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Промокод
          </CardTitle>
          <CardDescription>
            Скидка на тариф, бесплатные дни или дополнительный трафик.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PromoForm />
        </CardContent>
      </Card>

      {/* Payment history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg inline-flex items-center gap-2">
            <ReceiptText className="size-4" />
            История операций
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments && payments.length > 0 ? (
            <ul className="divide-y divide-border/60">
              {payments.map((p) => {
                const statusInfo =
                  PAYMENT_STATUS_LABEL[p.status] ??
                  PAYMENT_STATUS_LABEL.pending;
                return (
                  <li
                    key={p.id}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-medium">
                        {PAYMENT_PURPOSE_LABEL[p.purpose] ?? p.purpose}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateShort(p.created_at)} · {p.provider}
                      </div>
                    </div>
                    <div className="text-right space-y-0.5">
                      <div className="font-medium tabular-nums">
                        {formatRub(p.amount_rub, { withSign: true })}
                      </div>
                      <div className={`text-xs ${statusInfo.className}`}>
                        {statusInfo.label}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Пока операций нет.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
