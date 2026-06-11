"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Loader2, Pencil, X, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateServerMeta,
  renameNode,
  renameHost,
  bumpPaidUntil,
} from "@/app/admin/actions";

export interface EditableServer {
  id: string | null;
  ip: string;
  name: string;
  hosting: string | null;
  location: string | null;
  paid_until: string | null;
  cpu: string | null;
  ram: string | null;
  disk: string | null;
  bandwidth: string | null;
  traffic_limit_gb: number | null;
  notes: string | null;
  nodeId?: number;
  inboundTag?: string;
}

export function ServerEdit({ s }: { s: EditableServer }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} title="Редактировать">
        <Pencil className="size-4 text-muted-foreground" />
      </Button>
      {open && <EditModal s={s} onClose={() => setOpen(false)} />}
    </>
  );
}

function EditModal({ s, onClose }: { s: EditableServer; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const [f, setF] = useState({
    name: s.name,
    hosting: s.hosting ?? "",
    location: s.location ?? "",
    paid_until: s.paid_until ?? "",
    cpu: s.cpu ?? "",
    ram: s.ram ?? "",
    disk: s.disk ?? "",
    bandwidth: s.bandwidth ?? "",
    notes: s.notes ?? "",
  });
  const [unlimited, setUnlimited] = useState(s.traffic_limit_gb == null);
  const [trafficLimit, setTrafficLimit] = useState(
    s.traffic_limit_gb != null ? String(s.traffic_limit_gb) : "",
  );

  function set<K extends keyof typeof f>(k: K, v: string) {
    setF((p) => ({ ...p, [k]: v }));
  }

  // lock body scroll + close on Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function save() {
    setErr(null);
    start(async () => {
      if (f.name !== s.name) {
        if (s.nodeId != null) await renameNode(s.nodeId, s.ip, f.name);
        else if (s.inboundTag) await renameHost(s.inboundTag, f.name);
      }
      if (s.id) {
        const r = await updateServerMeta({
          id: s.id,
          name: f.name,
          hosting: f.hosting,
          location: f.location,
          paid_until: f.paid_until || null,
          cpu: f.cpu,
          ram: f.ram,
          disk: f.disk,
          bandwidth: f.bandwidth,
          traffic_limit_gb: unlimited ? null : parseInt(trafficLimit) || null,
          notes: f.notes,
        });
        if (!r.ok) {
          setErr(r.error ?? "Ошибка");
          return;
        }
      }
      onClose();
      router.refresh();
    });
  }

  function payNextMonth() {
    if (!s.id) return;
    start(async () => {
      const r = await bumpPaidUntil(s.id!, 1);
      if (!r.ok) {
        setErr(r.error ?? "Ошибка");
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-border/60 bg-card px-5 py-4">
          <div className="min-w-0">
            <h3 className="font-semibold truncate">Редактировать сервер</h3>
            <p className="text-xs text-muted-foreground font-mono truncate">{s.ip}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        {/* body */}
        <div className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Название" v={f.name} on={(v) => set("name", v)} />
            <Field label="Хостинг" v={f.hosting} on={(v) => set("hosting", v)} placeholder="serv.host" />
            <Field label="Локация" v={f.location} on={(v) => set("location", v)} placeholder="Москва" />
          </div>

          {/* Payment */}
          <div className="space-y-1.5">
            <Label className="text-xs">Оплачен до</Label>
            <div className="flex items-center gap-2">
              <Input
                value={f.paid_until}
                onChange={(e) => set("paid_until", e.target.value)}
                type="date"
                className="flex-1"
              />
              {s.id && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={payNextMonth}
                  disabled={pending}
                  title="Сдвинуть дату оплаты на месяц вперёд"
                >
                  <CheckCircle2 className="size-4" />
                  Оплачено +1 мес
                </Button>
              )}
            </div>
          </div>

          {/* Specs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="CPU" v={f.cpu} on={(v) => set("cpu", v)} placeholder="2" unit="vCPU" />
            <Field label="RAM" v={f.ram} on={(v) => set("ram", v)} placeholder="2" unit="ГБ" />
            <Field label="Диск" v={f.disk} on={(v) => set("disk", v)} placeholder="20" unit="ГБ" />
            <Field label="Полоса" v={f.bandwidth} on={(v) => set("bandwidth", v)} placeholder="1" unit="Гбит" />
          </div>

          {/* Traffic allowance */}
          <div className="space-y-1.5">
            <Label className="text-xs">Лимит трафика</Label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setUnlimited((v) => !v)}
                className={`shrink-0 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  unlimited
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                Безлимит
              </button>
              {!unlimited && (
                <div className="relative flex-1">
                  <Input
                    value={trafficLimit}
                    onChange={(e) => setTrafficLimit(e.target.value)}
                    placeholder="1000"
                    inputMode="numeric"
                    className="pr-10"
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                    ГБ
                  </span>
                </div>
              )}
            </div>
          </div>

          <Field label="Заметки" v={f.notes} on={(v) => set("notes", v)} />

          {err && <p className="text-xs text-destructive">{err}</p>}
          {!s.id && (
            <p className="text-[11px] text-amber-400">
              Сервера нет в реестре — название сменится в Marzban, но характеристики/оплата не сохранятся.
            </p>
          )}
        </div>

        {/* footer */}
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border/60 bg-card px-5 py-4">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>
            Отмена
          </Button>
          <Button size="sm" onClick={save} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Сохранить
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  v,
  on,
  placeholder,
  type,
  unit,
}: {
  label: string;
  v: string;
  on: (v: string) => void;
  placeholder?: string;
  type?: string;
  unit?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        <Input
          value={v}
          onChange={(e) => on(e.target.value)}
          placeholder={placeholder}
          type={type}
          className={unit ? "pr-12" : undefined}
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
