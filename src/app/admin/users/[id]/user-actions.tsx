"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Gift, Ban, Play, RotateCcw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  grantToUser,
  setUserStatus,
  resetUserTraffic,
  deleteUserFull,
} from "@/app/admin/actions";

export function UserActions({
  userId,
  status,
  devicesLimit,
}: {
  userId: string;
  status: string;
  devicesLimit: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [days, setDays] = useState("30");
  const [traffic, setTraffic] = useState("0");
  const [devices, setDevices] = useState(String(devicesLimit));
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

  function flash(t: string) {
    setMsg(t);
    setTimeout(() => setMsg(null), 3000);
  }

  function doGrant() {
    start(async () => {
      const r = await grantToUser({
        userId,
        addDays: parseInt(days) || 0,
        addTrafficGb: parseInt(traffic) || 0,
        setDevices: parseInt(devices) || null,
      });
      flash(r.ok ? "Применено" : r.error ?? "Ошибка");
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {/* Grant */}
      <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-3">
        <div className="text-sm font-medium inline-flex items-center gap-2">
          <Gift className="size-4 text-primary" />
          Выдать / изменить
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="days" className="text-xs">
              + дней
            </Label>
            <Input id="days" value={days} onChange={(e) => setDays(e.target.value)} inputMode="numeric" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tr" className="text-xs">
              + ГБ
            </Label>
            <Input id="tr" value={traffic} onChange={(e) => setTraffic(e.target.value)} inputMode="numeric" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dev" className="text-xs">
              устройств
            </Label>
            <Input id="dev" value={devices} onChange={(e) => setDevices(e.target.value)} inputMode="numeric" />
          </div>
        </div>
        <Button onClick={doGrant} disabled={pending} size="sm">
          {pending && <Loader2 className="animate-spin" />}
          Применить
        </Button>
      </div>

      {/* Status + reset */}
      <div className="flex flex-wrap gap-2">
        {status === "suspended" ? (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await setUserStatus(userId, "active");
                flash(r.ok ? "Разморожено" : r.error ?? "Ошибка");
                if (r.ok) router.refresh();
              })
            }
          >
            <Play className="size-4" />
            Разморозить
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await setUserStatus(userId, "suspended");
                flash(r.ok ? "Заморожено" : r.error ?? "Ошибка");
                if (r.ok) router.refresh();
              })
            }
          >
            <Ban className="size-4" />
            Заморозить
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await resetUserTraffic(userId);
              flash(r.ok ? "Трафик сброшен" : r.error ?? "Ошибка");
              if (r.ok) router.refresh();
            })
          }
        >
          <RotateCcw className="size-4" />
          Сбросить трафик
        </Button>
      </div>

      {/* Delete */}
      <div className="pt-2 border-t border-border/60">
        {!confirmDel ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setConfirmDel(true)}
          >
            <Trash2 className="size-4" />
            Удалить пользователя
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Точно удалить?</span>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDel(false)} disabled={pending}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await deleteUserFull(userId);
                  if (r.ok) router.push("/admin/users");
                  else flash(r.error ?? "Ошибка");
                })
              }
            >
              {pending && <Loader2 className="animate-spin" />}
              Удалить навсегда
            </Button>
          </div>
        )}
      </div>

      {msg && <div className="text-xs text-primary">{msg}</div>}
    </div>
  );
}
