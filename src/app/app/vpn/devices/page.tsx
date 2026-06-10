import Link from "next/link";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import type { Device, Subscription } from "@/types/db";

import {
  RemoveAllDevicesButton,
  RemoveDeviceButton,
} from "../device-actions";

export default async function DevicesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sub } = (await supabase
    .from("subscriptions")
    .select("id, devices_limit")
    .eq("user_id", user!.id)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle()) as { data: Pick<Subscription, "id" | "devices_limit"> | null };

  const { data: devices } = sub
    ? ((await supabase
        .from("devices")
        .select("*")
        .eq("subscription_id", sub.id)
        .order("last_seen", { ascending: false })) as {
        data: Device[] | null;
      })
    : { data: null };

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="space-y-2">
        <div className="text-sm">
          <Link
            href="/app/vpn"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Назад к подписке
          </Link>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Устройства
        </h1>
        <p className="text-sm text-muted-foreground">
          {sub
            ? `Подключено ${devices?.length ?? 0} из ${sub.devices_limit}.`
            : "Сначала оформи подписку."}
        </p>
      </header>

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
            <p className="text-sm text-muted-foreground py-4">
              Пока ни одного устройства. Подключи VPN — оно появится здесь
              автоматически.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
