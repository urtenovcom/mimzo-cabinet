import { Users } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { createClient } from "@/lib/supabase/server";
import { formatRub } from "@/lib/format";
import type { Referral } from "@/types/db";

const COMMISSION_PERCENT = 10;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.mimzo.ru";

export default async function ReferralsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const refLink = `${APP_URL}/register?ref=${user!.id.slice(0, 8)}`;

  const { data: referrals } = (await supabase
    .from("referrals")
    .select("*")
    .eq("referrer_id", user!.id)) as { data: Referral[] | null };

  const totalRefs = referrals?.length ?? 0;
  const totalEarned =
    referrals?.reduce((sum, r) => sum + Number(r.total_earned_rub), 0) ?? 0;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Рефералы
        </h1>
        <p className="text-sm text-muted-foreground">
          Приглашай друзей — получай {COMMISSION_PERCENT}% с каждого их платежа
          в Mimzo.
        </p>
      </header>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label="Приглашено" value={totalRefs.toString()} />
        <Stat
          label={`Комиссия (${COMMISSION_PERCENT}%)`}
          value={formatRub(totalEarned)}
        />
        <Stat label="Баланс реферальный" value={formatRub(0)} />
      </div>

      {/* Referral link */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg inline-flex items-center gap-2">
            <Users className="size-4" />
            Твоя реферальная ссылка
          </CardTitle>
          <CardDescription>
            Поделись с друзьями. Когда они купят тариф — тебе автоматически
            начислится комиссия.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg border border-border bg-card/60 px-3 py-2.5 text-xs font-mono text-muted-foreground">
              {refLink}
            </code>
            <CopyButton value={refLink} />
          </div>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Как это работает</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <Step n={1}>
              Поделись своей реферальной ссылкой с друзьями.
            </Step>
            <Step n={2}>
              Они регистрируются по ссылке и получают **3 дня демо-доступа**
              бесплатно (как обычно).
            </Step>
            <Step n={3}>
              Когда твой реферал покупает тариф —{" "}
              <span className="text-foreground">
                {COMMISSION_PERCENT}% от суммы платежа
              </span>{" "}
              зачисляется на твой реферальный баланс.
            </Step>
            <Step n={4}>
              Реферальным балансом можно оплатить свой тариф или вывести (от
              500 ₽).
            </Step>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5 space-y-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="size-6 shrink-0 rounded-full bg-primary/15 text-primary text-xs font-semibold inline-flex items-center justify-center">
        {n}
      </span>
      <span className="pt-0.5">{children}</span>
    </li>
  );
}
