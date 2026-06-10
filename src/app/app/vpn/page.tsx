import Link from "next/link";
import { Database, Sparkles } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/server";
import {
  formatBytes,
  formatDate,
  formatDaysLeft,
} from "@/lib/format";
import type { Device, Subscription } from "@/types/db";

import { RemoveAllDevicesButton, RemoveDeviceButton } from "./device-actions";

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

  const { data: devices } = (await supabase
    .from("devices")
    .select("*")
    .eq("subscription_id", sub.id)
    .order("last_seen", { ascending: false })) as { data: Device[] | null };

  const trafficUsedBytes = sub.traffic_used_bytes;
  const trafficTotalBytes = sub.traffic_gb * 1024 ** 3;
  const trafficPercent =
    trafficTotalBytes > 0 ? (trafficUsedBytes / trafficTotalBytes) * 100 : 0;
  const unlimited = sub.traffic_gb >= 9999;
  const usedDevices = devices?.length ?? 0;

  return (
    <div className="space-y-8">
      <header className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Подписка
        </h1>
        <p className="text-sm text-muted-foreground">
          Тариф, лимиты и устройства.
        </p>
      </header>

      {/* Tariff summary */}
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
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl border border-border/60 bg-card/40 p-4">
              <div className="text-xs text-muted-foreground">Истекает</div>
              <div className="text-lg font-semibold">
                {formatDaysLeft(sub.expires_at)}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDate(sub.expires_at)}
              </div>
            </div>
            <div className="rounded-xl border border-border/60 bg-card/40 p-4">
              <div className="text-xs text-muted-foreground">Устройства</div>
              <div className="text-lg font-semibold">
                {usedDevices} / {sub.devices_limit}
              </div>
              <div className="text-xs text-muted-foreground">
                подключённых / лимит
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Devices list */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-3">
          <CardTitle className="text-lg">Подключённые устройства</CardTitle>
          {devices && devices.length > 0 && <RemoveAllDevicesButton />}
        </CardHeader>
        <CardContent>
          {devices && devices.length > 0 ? (
            <ul className="divide-y divide-border/60">
              {devices.map((d) => (
                <li
                  key={d.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">
                        {d.display_name ?? d.client_app ?? "Устройство"}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                        {d.device_hash.slice(-8)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {[
                        d.os,
                        d.client_app,
                        new Date(d.last_seen).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        }),
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Неизвестный клиент"}
                    </div>
                  </div>
                  <RemoveDeviceButton deviceId={d.id} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-3 py-4">
              <p className="text-sm text-muted-foreground">
                Пока ни одного устройства. Подключи VPN — оно появится здесь
                автоматически.
              </p>
              <Button asChild size="sm" variant="outline">
                <Link href="/app/connect">К подключению</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
