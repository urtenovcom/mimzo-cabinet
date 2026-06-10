import Link from "next/link";
import {
  ChevronRight,
  Database,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { createClient } from "@/lib/supabase/server";
import {
  daysUntil,
  formatBytes,
  formatDate,
  formatDaysLeft,
  formatRub,
} from "@/lib/format";
import type { Profile, Subscription } from "@/types/db";

const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.mimzo.ru";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sub } = (await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user!.id)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle()) as { data: Subscription | null };

  const { data: profile } = (await supabase
    .from("profiles")
    .select("balance_rub")
    .eq("id", user!.id)
    .maybeSingle()) as { data: Pick<Profile, "balance_rub"> | null };

  const { count: devicesUsed } = sub
    ? await supabase
        .from("devices")
        .select("*", { count: "exact", head: true })
        .eq("subscription_id", sub.id)
    : { count: 0 };

  const name = user?.email?.split("@")[0] ?? "друг";
  const refLink = `${APP_ORIGIN}/register?ref=${user!.id.slice(0, 8)}`;

  // ── No active subscription state ──────────────────────────
  if (!sub) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight capitalize">
          Привет, {name}
        </h1>
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <p className="text-muted-foreground">
              У тебя пока нет активной подписки. Выбери тариф чтобы начать.
            </p>
            <Button asChild>
              <Link href="/app/vpn/change-plan">
                Выбрать тариф
                <ChevronRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const trafficUsedBytes = sub.traffic_used_bytes;
  const trafficTotalBytes = sub.traffic_gb * 1024 ** 3;
  const trafficPercent =
    trafficTotalBytes > 0 ? (trafficUsedBytes / trafficTotalBytes) * 100 : 0;
  const unlimited = sub.traffic_gb >= 9999;
  const daysLeft = Math.max(0, daysUntil(sub.expires_at));
  const planTitle = sub.is_trial ? "Демо-доступ" : "Базовый";
  const isExpiringSoon = daysLeft <= 3;

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight capitalize">
          Привет, {name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Здесь главное о твоём VPN на одном экране.
        </p>
      </header>

      {/* Critical banner — only when something needs attention */}
      {(sub.is_trial || isExpiringSoon) && (
        <Card className="border-primary/40 bg-primary/[0.08]">
          <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 sm:p-5">
            <div className="size-10 shrink-0 rounded-lg bg-primary/15 grid place-items-center text-primary">
              <Sparkles className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium">
                {sub.is_trial
                  ? `Демо-доступ — ${formatDaysLeft(sub.expires_at)} осталось`
                  : `Подписка истекает через ${formatDaysLeft(sub.expires_at)}`}
              </div>
              <div className="text-sm text-muted-foreground">
                {sub.is_trial
                  ? "Выбери тариф заранее чтобы не остаться без VPN."
                  : "Продли подписку чтобы продолжить пользоваться."}
              </div>
            </div>
            <Button asChild className="shrink-0">
              <Link href="/app/vpn/change-plan">
                Выбрать тариф
                <ChevronRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* HERO STATUS — primary glanceable card */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-3">
          <div className="space-y-1">
            <CardDescription>Подписка активна</CardDescription>
            <CardTitle className="text-2xl">{planTitle}</CardTitle>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <Link href="/app/vpn">
              Подробнее
              <ChevronRight />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Traffic bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground inline-flex items-center gap-1.5">
                <Database className="size-3.5" />
                Трафик
              </span>
              <span className="tabular-nums">
                <span className="font-medium text-foreground">
                  {formatBytes(trafficUsedBytes)}
                </span>
                <span className="text-muted-foreground">
                  {" / "}
                  {unlimited ? "Безлимит" : `${sub.traffic_gb} ГБ`}
                </span>
              </span>
            </div>
            {!unlimited && <Progress value={trafficPercent} />}
          </div>

          {/* Two small stats — devices + days */}
          <div className="grid grid-cols-2 gap-3">
            <MiniStat
              icon={<Smartphone className="size-4" />}
              label="Устройства"
              value={`${devicesUsed ?? 0} / ${sub.devices_limit}`}
            />
            <MiniStat
              icon={<ShieldCheck className="size-4" />}
              label="Дней"
              value={`${daysLeft}`}
              hint={formatDate(sub.expires_at)}
            />
          </div>

        </CardContent>
      </Card>

      {/* Secondary row — balance + referral teaser */}
      <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="inline-flex items-center gap-1.5">
              <Wallet className="size-3.5" />
              Баланс
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatRub(profile?.balance_rub ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/app/billing">
                Финансы
                <ChevronRight />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="inline-flex items-center gap-1.5">
              <Users className="size-3.5" />
              Рефералы
            </CardDescription>
            <CardTitle className="text-base font-medium leading-snug">
              Приглашай друзей — 30% с их оплат
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <code className="block truncate rounded-md border border-border bg-card/60 px-2.5 py-1.5 text-xs font-mono text-muted-foreground">
              {refLink}
            </code>
            <div className="flex gap-2">
              <CopyButton value={refLink} />
              <Button asChild variant="ghost" size="sm" className="flex-1">
                <Link href="/app/referrals">
                  Подробнее
                  <ChevronRight />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-3.5 space-y-0.5">
      <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      {hint && (
        <div className="text-[10px] text-muted-foreground/80 truncate">
          {hint}
        </div>
      )}
    </div>
  );
}
