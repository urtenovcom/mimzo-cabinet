import Link from "next/link";
import {
  ChevronRight,
  Database,
  Smartphone,
  Sparkles,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CopyButton } from "@/components/ui/copy-button";
import { createClient } from "@/lib/supabase/server";
import {
  formatBytes,
  formatDate,
  formatDaysLeft,
} from "@/lib/format";
import type { Subscription } from "@/types/db";

import { InstructionsBlock } from "./instructions";

export default async function VpnPage() {
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

  if (!sub) {
    return (
      <div className="space-y-4">
        <header className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Подписка
          </h1>
          <p className="text-sm text-muted-foreground">
            Активной подписки нет.
          </p>
        </header>
        <Card>
          <CardContent className="p-6 text-center">
            <Button asChild>
              <Link href="/app/vpn/change-plan">Выбрать тариф</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { count: devicesUsed } = await supabase
    .from("devices")
    .select("*", { count: "exact", head: true })
    .eq("subscription_id", sub.id);

  const trafficUsedBytes = sub.traffic_used_bytes;
  const trafficTotalBytes = sub.traffic_gb * 1024 ** 3;
  const trafficPercent =
    trafficTotalBytes > 0 ? (trafficUsedBytes / trafficTotalBytes) * 100 : 0;
  const unlimited = sub.traffic_gb >= 9999;

  const subUrl = `https://sub.mimzo.ru/sub/${sub.sub_token}`;
  const happUrl = `happ://add/${Buffer.from(subUrl).toString("base64url")}`;

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Подписка
        </h1>
        <p className="text-sm text-muted-foreground">
          Тариф, ссылка для Happ, устройства и инструкции.
        </p>
      </header>

      {/* Tariff + traffic + days + devices (with link) */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-3">
          <div className="space-y-1">
            <CardDescription>
              {sub.is_trial ? "Демо-доступ" : "Активный тариф"}
            </CardDescription>
            <CardTitle className="text-2xl">
              {sub.is_trial ? "Демо" : "Базовый"}
            </CardTitle>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/app/vpn/change-plan">
              <Sparkles className="size-4" />
              Сменить тариф
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

          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-border/60 bg-card/40 p-4">
              <div className="text-xs text-muted-foreground">Истекает</div>
              <div className="text-lg font-semibold">
                {formatDaysLeft(sub.expires_at)}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDate(sub.expires_at)}
              </div>
            </div>

            {/* Devices stat + link to dedicated page */}
            <Link
              href="/app/vpn/devices"
              className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:bg-card/70 flex items-center justify-between gap-3"
            >
              <div>
                <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                  <Smartphone className="size-3.5" />
                  Устройства
                </div>
                <div className="text-lg font-semibold tabular-nums">
                  {devicesUsed ?? 0} / {sub.devices_limit}
                </div>
                <div className="text-xs text-muted-foreground">
                  открыть список
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Sub URL + Happ button */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Подключение</CardTitle>
          <CardDescription>
            Скопируй ссылку и добавь её в Happ — VPN настроится сам.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg border border-border bg-card/60 px-3 py-2.5 text-xs font-mono text-muted-foreground">
              {subUrl}
            </code>
            <CopyButton value={subUrl} />
          </div>
          <Button asChild className="w-full sm:w-auto">
            <a href={happUrl}>Открыть в Happ</a>
          </Button>
        </CardContent>
      </Card>

      {/* Instructions — separate block below the connection card */}
      <InstructionsBlock />
    </div>
  );
}
