import { Server, Globe } from "lucide-react";

import {
  getNodes,
  getNodeUsage,
  getHosts,
  getServerRegistry,
  type ServerMeta,
} from "@/lib/admin-data";
import { formatBytes } from "@/lib/format";
import { HostToggle } from "./host-toggle";
import { ServerEdit, type EditableServer } from "./server-edit";

export const dynamic = "force-dynamic";

function trafficLine(usedBytes: number | null, limitGb: number | null) {
  const used = usedBytes != null ? formatBytes(usedBytes) : null;
  if (limitGb == null) {
    // unlimited
    return used
      ? { txt: `${used} / безлимит`, cls: "text-muted-foreground" }
      : { txt: "безлимит", cls: "text-muted-foreground" };
  }
  const limitBytes = limitGb * 1024 ** 3;
  const pct = usedBytes != null ? (usedBytes / limitBytes) * 100 : 0;
  const cls =
    pct >= 90 ? "text-red-400" : pct >= 75 ? "text-amber-400" : "text-muted-foreground";
  return {
    txt: `${used ?? "0 Б"} / ${limitGb} ГБ${usedBytes != null ? ` (${Math.round(pct)}%)` : ""}`,
    cls,
  };
}

function paidBadge(date: string | null) {
  if (!date) return { txt: "—", cls: "text-muted-foreground" };
  const days = Math.ceil(
    (new Date(date).getTime() - Date.now()) / 86400_000,
  );
  const d = new Date(date).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
  });
  if (days < 0) return { txt: `${d} (просрочен)`, cls: "text-red-400" };
  if (days <= 7) return { txt: `${d} (через ${days} дн.)`, cls: "text-amber-400" };
  return { txt: d, cls: "text-muted-foreground" };
}

// Append a unit only when the stored value is a bare number, so a
// manually-typed "1 ТБ" stays as-is but "20" becomes "20 ГБ".
function withUnit(val: string | null, unit: string): string | null {
  if (!val) return null;
  return /^[\d.,]+$/.test(val.trim()) ? `${val.trim()} ${unit}` : val;
}

function specs(s?: ServerMeta) {
  if (!s) return "";
  return [
    withUnit(s.cpu, "vCPU"),
    withUnit(s.ram, "ГБ"),
    withUnit(s.disk, "ГБ"),
    withUnit(s.bandwidth, "Гбит"),
  ]
    .filter(Boolean)
    .join(" · ");
}

export default async function AdminServers() {
  let nodes: Awaited<ReturnType<typeof getNodes>> = [];
  let hosts: Awaited<ReturnType<typeof getHosts>> = [];
  let registry: ServerMeta[] = [];
  let usage = new Map<number, number>();
  let err: string | null = null;
  try {
    [nodes, hosts, registry, usage] = await Promise.all([
      getNodes(),
      getHosts(),
      getServerRegistry().catch(() => []),
      getNodeUsage().catch(() => new Map<number, number>()),
    ]);
  } catch (e) {
    err = String(e);
  }

  const byIp = new Map(registry.map((r) => [r.ip, r]));
  const byTag = new Map(
    registry.filter((r) => r.inbound_tag).map((r) => [r.inbound_tag!, r]),
  );

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Серверы
        </h1>
        <p className="text-sm text-muted-foreground">
          Мосты, локации, оплата и характеристики.
        </p>
      </header>

      {err && (
        <p className="text-sm text-destructive">
          Не удалось получить данные Marzban: {err}
        </p>
      )}

      {/* ── Bridges (nodes) ── */}
      <section className="space-y-4">
        <h2 className="font-semibold inline-flex items-center gap-2">
          <Server className="size-4" />
          Мосты (РФ-вход)
        </h2>
        <div className="rounded-2xl border border-border/60 bg-card/40 divide-y divide-border/60">
          {nodes.map((n) => {
            const meta = byIp.get(n.address);
            const healthy = n.status === "connected";
            const pb = paidBadge(meta?.paid_until ?? null);
            const usedBytes = usage.get(n.id) ?? null;
            const tl = trafficLine(usedBytes, meta?.traffic_limit_gb ?? null);
            const editable: EditableServer = {
              id: meta?.id ?? null,
              ip: n.address,
              name: meta?.name ?? n.name,
              hosting: meta?.hosting ?? null,
              location: meta?.location ?? null,
              paid_until: meta?.paid_until ?? null,
              cpu: meta?.cpu ?? null,
              ram: meta?.ram ?? null,
              disk: meta?.disk ?? null,
              bandwidth: meta?.bandwidth ?? null,
              traffic_limit_gb: meta?.traffic_limit_gb ?? null,
              notes: meta?.notes ?? null,
              nodeId: n.id,
            };
            return (
              <div key={n.id} className="grid grid-cols-[1fr_auto] gap-x-4 px-5 py-3.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{meta?.name ?? n.name}</span>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] ${healthy ? "text-emerald-400" : "text-red-400"}`}
                    >
                      <span className={`size-1.5 rounded-full ${healthy ? "bg-emerald-400" : "bg-red-400"}`} />
                      {healthy ? "онлайн" : n.status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span className="font-mono">{n.address}</span>
                    {meta?.hosting && <span>{meta.hosting}</span>}
                    {meta?.location && <span>{meta.location}</span>}
                    {specs(meta) && <span>{specs(meta)}</span>}
                    <span className={tl.cls}>трафик: {tl.txt}</span>
                    <span className={pb.cls}>оплата: {pb.txt}</span>
                  </div>
                </div>
                <div className="self-start">
                  <ServerEdit s={editable} />
                </div>
              </div>
            );
          })}
          {nodes.length === 0 && !err && (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">Нет нод.</p>
          )}
        </div>
      </section>

      {/* ── Locations (hosts / exits) ── */}
      <section className="space-y-4">
        <h2 className="font-semibold inline-flex items-center gap-2">
          <Globe className="size-4" />
          Локации (иностранный выход)
        </h2>
        <div className="rounded-2xl border border-border/60 bg-card/40 divide-y divide-border/60">
          {hosts.map((h) => {
            const meta = byTag.get(h.inboundTag);
            const pb = paidBadge(meta?.paid_until ?? null);
            const limitGb = meta?.traffic_limit_gb ?? null;
            const editable: EditableServer = {
              id: meta?.id ?? null,
              ip: meta?.ip ?? h.address,
              name: h.remark,
              hosting: meta?.hosting ?? null,
              location: meta?.location ?? null,
              paid_until: meta?.paid_until ?? null,
              cpu: meta?.cpu ?? null,
              ram: meta?.ram ?? null,
              disk: meta?.disk ?? null,
              bandwidth: meta?.bandwidth ?? null,
              traffic_limit_gb: limitGb,
              notes: meta?.notes ?? null,
              inboundTag: h.inboundTag,
            };
            return (
              <div key={h.inboundTag} className="grid grid-cols-[1fr_auto_auto] items-start gap-x-2 px-5 py-3.5">
                <div className="min-w-0">
                  <div className={`font-medium truncate ${h.is_disabled ? "text-muted-foreground line-through" : ""}`}>
                    {h.remark}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                    {meta?.ip && <span className="font-mono">{meta.ip}</span>}
                    {meta?.hosting && <span>{meta.hosting}</span>}
                    {meta?.location && <span>{meta.location}</span>}
                    {specs(meta) && <span>{specs(meta)}</span>}
                    <span>трафик: {limitGb == null ? "безлимит" : `лимит ${limitGb} ГБ`}</span>
                    {meta?.paid_until && <span className={pb.cls}>оплата: {pb.txt}</span>}
                  </div>
                </div>
                <ServerEdit s={editable} />
                <HostToggle inboundTag={h.inboundTag} disabled={h.is_disabled} />
              </div>
            );
          })}
          {hosts.length === 0 && !err && (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">Нет локаций.</p>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Тумблер питания выключает локацию (перезапуск ядра ~5 сек, сервер исчезает из подписок). Карандаш — редактировать название, хостинг, оплату, характеристики.
        </p>
      </section>
    </div>
  );
}
