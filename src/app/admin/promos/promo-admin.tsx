"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Plus, Power, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPromo, togglePromo, deletePromo } from "@/app/admin/actions";

interface PromoRow {
  id: string;
  code: string;
  grant_devices: number | null;
  grant_traffic_gb: number | null;
  grant_days: number | null;
  uses_count: number;
  uses_total: number | null;
  is_active: boolean;
}

export function PromoAdmin({ promos }: { promos: PromoRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [devices, setDevices] = useState("");
  const [traffic, setTraffic] = useState("");
  const [days, setDays] = useState("");
  const [uses, setUses] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function submit() {
    setErr(null);
    start(async () => {
      const r = await createPromo({
        code,
        grantDevices: devices ? parseInt(devices) : null,
        grantTrafficGb: traffic ? parseInt(traffic) : null,
        grantDays: days ? parseInt(days) : null,
        usesTotal: uses ? parseInt(uses) : null,
      });
      if (r.ok) {
        setOpen(false);
        setCode("");
        setDevices("");
        setTraffic("");
        setDays("");
        setUses("");
        router.refresh();
      } else setErr(r.error ?? "Ошибка");
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Всего: {promos.length}</p>
        <Button size="sm" onClick={() => setOpen((v) => !v)}>
          <Plus className="size-4" />
          Создать
        </Button>
      </div>

      {open && (
        <div className="rounded-2xl border border-primary/40 bg-primary/[0.05] p-5 space-y-4">
          <div className="grid sm:grid-cols-5 gap-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label className="text-xs">Код</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="WELCOME" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Устройств</Label>
              <Input value={devices} onChange={(e) => setDevices(e.target.value)} placeholder="—" inputMode="numeric" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Трафик, ГБ</Label>
              <InfField value={traffic} set={setTraffic} placeholder="200" infLabel="Безлимит" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Срок, дней</Label>
              <InfField value={days} set={setDays} placeholder="30" infLabel="Бессрочно" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Лимит примен.</Label>
              <Input value={uses} onChange={(e) => setUses(e.target.value)} placeholder="∞" inputMode="numeric" />
            </div>
          </div>
          {err && <p className="text-xs text-destructive">{err}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={submit} disabled={pending || code.length < 2}>
              {pending && <Loader2 className="animate-spin" />}
              Создать промокод
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Отмена
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
        <ul className="divide-y divide-border/60">
          {promos.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold">{p.code}</span>
                  {!p.is_active && (
                    <span className="text-[10px] uppercase text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                      выкл
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {[
                    p.grant_devices != null && `${p.grant_devices} устр.`,
                    p.grant_traffic_gb != null &&
                      (p.grant_traffic_gb >= 9999 ? "∞ трафик" : `${p.grant_traffic_gb} ГБ`),
                    p.grant_days != null && `${p.grant_days >= 9999 ? "бессрочно" : `${p.grant_days} дн.`}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  {" · "}
                  применён {p.uses_count}
                  {p.uses_total != null ? `/${p.uses_total}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      await togglePromo(p.id, !p.is_active);
                      router.refresh();
                    })
                  }
                  title={p.is_active ? "Выключить" : "Включить"}
                >
                  <Power className={`size-4 ${p.is_active ? "text-emerald-400" : "text-muted-foreground"}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() =>
                    start(async () => {
                      await deletePromo(p.id);
                      router.refresh();
                    })
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
        {promos.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">Промокодов нет.</p>
        )}
      </div>
    </div>
  );
}

/** Numeric input with an "∞" toggle that sets the value to 9999 (unlimited). */
function InfField({
  value,
  set,
  placeholder,
  infLabel,
}: {
  value: string;
  set: (v: string) => void;
  placeholder: string;
  infLabel: string;
}) {
  const isInf = value === "9999";
  if (isInf) {
    return (
      <button
        type="button"
        onClick={() => set("")}
        className="w-full inline-flex items-center justify-between rounded-lg border border-primary/50 bg-primary/10 text-primary px-3 py-2 text-sm"
        title="Нажми, чтобы задать число"
      >
        <span>{infLabel} ∞</span>
        <span className="text-xs opacity-70">✕</span>
      </button>
    );
  }
  return (
    <div className="flex gap-1">
      <Input
        value={value}
        onChange={(e) => set(e.target.value)}
        placeholder={placeholder}
        inputMode="numeric"
      />
      <button
        type="button"
        onClick={() => set("9999")}
        title={infLabel}
        className="shrink-0 rounded-lg border border-border px-2.5 text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
      >
        ∞
      </button>
    </div>
  );
}
