import {
  Calendar,
  Database,
  ChevronRight,
  Smartphone,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

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
import { daysUntil, formatBytes, formatDate, formatDaysLeft } from "@/lib/format";
import type { Subscription } from "@/types/db";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch active subscription (the one expiring the latest)
  const { data: sub } = (await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user!.id)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle()) as { data: Subscription | null };

  const { count: devicesUsed } = sub
    ? await supabase
        .from("devices")
        .select("*", { count: "exact", head: true })
        .eq("subscription_id", sub.id)
    : { count: 0 };

  const name = user?.email?.split("@")[0] ?? "друг";
  const subUrl = sub
    ? `https://sub.mimzo.ru/sub/${sub.sub_token}`
    : "";
  const trafficUsedBytes = sub?.traffic_used_bytes ?? 0;
  const trafficTotalBytes = sub ? sub.traffic_gb * 1024 ** 3 : 0;
  const trafficPercent =
    trafficTotalBytes > 0 ? (trafficUsedBytes / trafficTotalBytes) * 100 : 0;
  const daysLeft = sub ? Math.max(0, daysUntil(sub.expires_at)) : 0;
  const planTitle = sub?.is_trial ? "Демо" : "Базовый";
  const unlimited = (sub?.traffic_gb ?? 0) >= 9999;

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
              <Link href="/app/plans">
                Выбрать тариф
                <ChevronRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight capitalize">
          Привет, {name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Здесь главное о твоей подписке. Управление — слева в меню.
        </p>
      </header>

      {sub.is_trial && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3 p-5">
            <div className="size-10 shrink-0 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
              <Sparkles className="size-5" />
            </div>
            <div className="flex-1">
              <div className="font-medium">
                У тебя демо-доступ — {formatDaysLeft(sub.expires_at)} осталось
              </div>
              <div className="text-sm text-muted-foreground">
                Чтобы продолжить без перерывов — выбери тариф заранее.
              </div>
            </div>
            <Button asChild>
              <Link href="/app/plans">
                Выбрать тариф
                <ChevronRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0 gap-4">
          <div className="space-y-1">
            <CardDescription>Текущий тариф</CardDescription>
            <CardTitle className="text-2xl">{planTitle}</CardTitle>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/app/vpn">
              Открыть VPN
              <ChevronRight />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
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

          <div className="grid sm:grid-cols-2 gap-4">
            <Stat
              icon={<Calendar className="size-4" />}
              label="Истекает"
              value={formatDaysLeft(sub.expires_at)}
              hint={formatDate(sub.expires_at)}
            />
            <Stat
              icon={<Smartphone className="size-4" />}
              label="Устройства"
              value={`${devicesUsed ?? 0} / ${sub.devices_limit}`}
              hint="используется / лимит"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ссылка-подписка для Happ</CardTitle>
          <CardDescription>
            Вставь её в Happ → «Добавить подписку». VPN настроится автоматически.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg border border-border bg-card/60 px-3 py-2.5 text-xs font-mono text-muted-foreground">
              {subUrl}
            </code>
            <CopyButton value={subUrl} />
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Дней до истечения: {daysLeft}
      </p>
    </div>
  );
}

function Stat({
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
    <div className="rounded-xl border border-border/60 bg-card/60 p-4 space-y-1">
      <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
