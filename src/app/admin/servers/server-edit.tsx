"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateServerMeta, renameNode, renameHost } from "@/app/admin/actions";

export interface EditableServer {
  id: string | null; // registry id (null if no registry row yet)
  ip: string;
  name: string;
  hosting: string | null;
  location: string | null;
  paid_until: string | null;
  cpu: string | null;
  ram: string | null;
  disk: string | null;
  bandwidth: string | null;
  notes: string | null;
  // for renaming the Marzban entity
  nodeId?: number;
  inboundTag?: string;
}

export function ServerEdit({ s }: { s: EditableServer }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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

  function set<K extends keyof typeof f>(k: K, v: string) {
    setF((p) => ({ ...p, [k]: v }));
  }

  function save() {
    setErr(null);
    start(async () => {
      // 1) rename the Marzban entity if name changed
      if (f.name !== s.name) {
        if (s.nodeId != null) await renameNode(s.nodeId, s.ip, f.name);
        else if (s.inboundTag) await renameHost(s.inboundTag, f.name);
      }
      // 2) update registry metadata
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
          notes: f.notes,
        });
        if (!r.ok) {
          setErr(r.error ?? "Ошибка");
          return;
        }
      }
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} title="Редактировать">
        <Pencil className="size-4 text-muted-foreground" />
      </Button>
    );
  }

  return (
    <div className="col-span-full mt-3 rounded-xl border border-primary/30 bg-primary/[0.04] p-4 space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Название" v={f.name} on={(v) => set("name", v)} />
        <Field label="Хостинг" v={f.hosting} on={(v) => set("hosting", v)} placeholder="serv.host" />
        <Field label="Локация" v={f.location} on={(v) => set("location", v)} placeholder="Москва" />
        <Field label="Оплачен до" v={f.paid_until} on={(v) => set("paid_until", v)} type="date" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="CPU" v={f.cpu} on={(v) => set("cpu", v)} placeholder="2" unit="vCPU" />
        <Field label="RAM" v={f.ram} on={(v) => set("ram", v)} placeholder="2" unit="ГБ" />
        <Field label="Диск" v={f.disk} on={(v) => set("disk", v)} placeholder="20" unit="ГБ" />
        <Field label="Полоса" v={f.bandwidth} on={(v) => set("bandwidth", v)} placeholder="1" unit="Гбит" />
      </div>
      <Field label="Заметки" v={f.notes} on={(v) => set("notes", v)} />
      {err && <p className="text-xs text-destructive">{err}</p>}
      {!s.id && (
        <p className="text-[11px] text-amber-400">
          Этого сервера нет в реестре — название сменится в Marzban, но характеристики/оплата не сохранятся. Добавь сервер в реестр (миграция).
        </p>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Сохранить
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Отмена
        </Button>
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
