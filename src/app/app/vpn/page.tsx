import {
  Apple,
  Database,
  Smartphone,
  MonitorSmartphone,
  ExternalLink,
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
import type { Device, Subscription } from "@/types/db";

import { RemoveAllDevicesButton, RemoveDeviceButton } from "./device-actions";

const HAPP_LINKS: Array<{ name: string; href: string; Icon: typeof Apple }> = [
  {
    name: "iOS",
    href: "https://apps.apple.com/us/app/happ-proxy-utility/id6504287215",
    Icon: Apple,
  },
  {
    name: "Android",
    href: "https://play.google.com/store/apps/details?id=com.happproxy",
    Icon: Smartphone,
  },
  {
    name: "Windows / macOS",
    href: "https://happ.su/main/downloads",
    Icon: MonitorSmartphone,
  },
];

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
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Моя подписка
        </h1>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              Активной подписки нет. Загляни на странице тарифов.
            </p>
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

  const subUrl = `https://sub.mimzo.ru/sub/${sub.sub_token}`;
  const happUrl = `happ://add/${Buffer.from(subUrl).toString("base64url")}`;
  const trafficUsedBytes = sub.traffic_used_bytes;
  const trafficTotalBytes = sub.traffic_gb * 1024 ** 3;
  const trafficPercent =
    trafficTotalBytes > 0 ? (trafficUsedBytes / trafficTotalBytes) * 100 : 0;
  const unlimited = sub.traffic_gb >= 9999;
  const usedDevices = devices?.length ?? 0;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Моя подписка
        </h1>
        <p className="text-sm text-muted-foreground">
          Управление VPN: ссылка-подписка, устройства, обновление лимитов.
        </p>
      </header>

      {/* Subscription summary */}
      <Card>
        <CardHeader>
          <CardDescription>
            {sub.is_trial ? "Демо-доступ" : "Активный тариф"}
          </CardDescription>
          <CardTitle className="text-2xl">
            {sub.is_trial ? "Демо" : "Базовый"}
          </CardTitle>
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

      {/* Subscription URL + connect */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Подключение в Happ</CardTitle>
          <CardDescription>
            Скачай Happ → импортируй подписку → выбери сервер → подключайся.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col sm:flex-row gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg border border-border bg-card/60 px-3 py-2.5 text-xs font-mono text-muted-foreground">
              {subUrl}
            </code>
            <CopyButton value={subUrl} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <a href={happUrl}>Открыть в Happ</a>
            </Button>
            {HAPP_LINKS.map(({ name, href, Icon }) => (
              <Button
                key={name}
                asChild
                variant="outline"
                size="sm"
              >
                <a href={href} target="_blank" rel="noreferrer">
                  <Icon />
                  {name}
                  <ExternalLink />
                </a>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Devices list */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-3">
          <div className="space-y-1">
            <CardTitle className="text-lg">Подключённые устройства</CardTitle>
            <CardDescription>
              Считаются только реальные подключения VPN-клиента (Happ и т.п.) — браузер и тесты не занимают слот.
            </CardDescription>
          </div>
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
                      {d.hwid && (
                        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                          {d.hwid.slice(-8)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {[
                        d.os,
                        d.client_app && d.app_version
                          ? `${d.client_app} ${d.app_version}`
                          : d.client_app,
                        new Date(d.last_seen).toLocaleString("ru-RU", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
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
            <p className="text-sm text-muted-foreground">
              Пока ни одного устройства. Подключи VPN — оно появится здесь
              автоматически.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
