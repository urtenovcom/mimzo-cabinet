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

function paidBadge(date: string | null) {
  if (!date) return { txt: "—", cls: "text-muted-foreground" };
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86400_000);
  const d = new Date(date).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
  if (days < 0) return { txt: `${d} · просрочен`, cls: "text-red-400" };
  if (days <= 7) return { txt: `${d} · ${days} дн.`, cls: "text-amber-400" };
  return { txt: d, cls: "text-foreground/80" };
}

function withUnit(val: string | null, unit: string): string | null {
  if (!val) return null;
  return /^[\d.,]+$/.test(val.trim()) ? `${val.trim()} ${unit}` : val;
}

function specs(s?: ServerMeta): string {
  if (!s) return "—";
  const parts = [
    withUnit(s.cpu, "vCPU"),
    withUnit(s.ram, "ГБ"),
    withUnit(s.disk, "ГБ"),
    withUnit(s.bandwidth, "Гбит"),
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

function trafficLine(usedBytes: number | null, limitGb: number | null) {
  const used = usedBytes != null ? formatBytes(usedBytes) : null;
  if (limitGb == null) {
    return { txt: used ? `${used} / ∞` : "безлимит", cls: "text-foreground/80" };
  }
  const limitBytes = limitGb * 1024 ** 3;
  const pct = usedBytes != null ? (usedBytes / limitBytes) * 100 : 0;
  const cls = pct >= 90 ? "text-red-400" : pct >= 75 ? "text-amber-400" : "text-foreground/80";
  return {
    txt: `${used ?? "0 Б"} / ${limitGb} ГБ${usedBytes != null ? ` · ${Math.round(pct)}%` : ""}`,
    cls,
  };
}

const FLAGS: { kw: string; flag: string }[] = [
  { kw: "финлянд", flag: "🇫🇮" },
  { kw: "герман", flag: "🇩🇪" },
  { kw: "нидерланд", flag: "🇳🇱" },
  { kw: "польш", flag: "🇵🇱" },
  { kw: "гданьск", flag: "🇵🇱" },
  { kw: "болгар", flag: "🇧🇬" },
  { kw: "софия", flag: "🇧🇬" },
  { kw: "росси", flag: "🇷🇺" },
  { kw: "москв", flag: "🇷🇺" },
];

function flagFor(...sources: (string | null | undefined)[]): string {
  const hay = sources.filter(Boolean).join(" ").toLowerCase();
  return FLAGS.find((f) => hay.includes(f.kw))?.flag ?? "🏳️";
}

// shared column template (desktop)
const COLS = "md:grid-cols-[1.5fr_1fr_1.4fr_1.3fr_1fr_auto]";

function HeadRow({ extra }: { extra?: string }) {
  return (
    <div
      className={`hidden md:grid ${COLS} gap-4 px-5 py-2.5 text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border/60`}
    >
      <span>Название</span>
      <span>Хостинг</span>
      <span>Характеристики</span>
      <span>Трафик</span>
      <span>Оплата</span>
      <span className="text-right">{extra ?? ""}</span>
    </div>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <span className="md:hidden text-[11px] uppercase tracking-wide text-muted-foreground mr-2">
        {label}
      </span>
      {children}
    </div>
  );
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
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Серверы</h1>
        <p className="text-sm text-muted-foreground">
          Мосты, локации, оплата и характеристики.
        </p>
      </header>

      {err && (
        <p className="text-sm text-destructive">
          Не удалось получить данные Marzban: {err}
        </p>
      )}

      {/* ── Bridges ── */}
      <section className="space-y-3">
        <h2 className="font-semibold inline-flex items-center gap-2">
          <Server className="size-4" />
          Мосты (РФ-вход)
        </h2>
        <div className="rounded-2xl border border-border/60 bg-card/40">
          <HeadRow />
          <div className="divide-y divide-border/60">
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
                <div
                  key={n.id}
                  className={`grid grid-cols-2 ${COLS} gap-x-4 gap-y-1.5 px-5 py-3.5 items-center`}
                >
                  <Cell label="">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{meta?.name ?? n.name}</span>
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] shrink-0 ${healthy ? "text-emerald-400" : "text-red-400"}`}
                      >
                        <span className={`size-1.5 rounded-full ${healthy ? "bg-emerald-400" : "bg-red-400"}`} />
                        {healthy ? "онлайн" : n.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono">{n.address}</div>
                  </Cell>
                  <Cell label="Хостинг">
                    <span className="text-sm text-foreground/80">{meta?.hosting ?? "—"}</span>
                  </Cell>
                  <Cell label="Характеристики">
                    <span className="text-sm text-foreground/80">{specs(meta)}</span>
                  </Cell>
                  <Cell label="Трафик">
                    <span className={`text-sm ${tl.cls}`}>{tl.txt}</span>
                  </Cell>
                  <Cell label="Оплата">
                    <span className={`text-sm ${pb.cls}`}>{pb.txt}</span>
                  </Cell>
                  <div className="col-span-2 md:col-span-1 justify-self-end">
                    <ServerEdit s={editable} />
                  </div>
                </div>
              );
            })}
          </div>
          {nodes.length === 0 && !err && (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">Нет нод.</p>
          )}
        </div>
      </section>

      {/* ── Locations ── */}
      <section className="space-y-3">
        <h2 className="font-semibold inline-flex items-center gap-2">
          <Globe className="size-4" />
          Локации (иностранный выход)
        </h2>
        <div className="rounded-2xl border border-border/60 bg-card/40">
          <HeadRow extra="" />
          <div className="divide-y divide-border/60">
            {hosts.map((h) => {
              const meta = byTag.get(h.inboundTag);
              const pb = paidBadge(meta?.paid_until ?? null);
              const limitGb = meta?.traffic_limit_gb ?? null;
              const flag = flagFor(meta?.location, h.remark);
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
                <div
                  key={h.inboundTag}
                  className={`grid grid-cols-2 ${COLS} gap-x-4 gap-y-1.5 px-5 py-3.5 items-center`}
                >
                  <Cell label="">
                    <div className="flex items-center gap-2">
                      <span className="text-lg leading-none shrink-0" aria-hidden>
                        {flag}
                      </span>
                      <span className={`font-medium truncate ${h.is_disabled ? "text-muted-foreground line-through" : ""}`}>
                        {h.remark}
                      </span>
                    </div>
                    {meta?.ip && (
                      <div className="text-[11px] text-muted-foreground font-mono pl-7">{meta.ip}</div>
                    )}
                  </Cell>
                  <Cell label="Хостинг">
                    <span className="text-sm text-foreground/80">{meta?.hosting ?? "—"}</span>
                  </Cell>
                  <Cell label="Характеристики">
                    <span className="text-sm text-foreground/80">{specs(meta)}</span>
                  </Cell>
                  <Cell label="Трафик">
                    <span className="text-sm text-foreground/80">
                      {limitGb == null ? "безлимит" : `лимит ${limitGb} ГБ`}
                    </span>
                  </Cell>
                  <Cell label="Оплата">
                    <span className={`text-sm ${pb.cls}`}>{pb.txt}</span>
                  </Cell>
                  <div className="col-span-2 md:col-span-1 flex items-center justify-end gap-1">
                    <ServerEdit s={editable} />
                    <HostToggle inboundTag={h.inboundTag} disabled={h.is_disabled} />
                  </div>
                </div>
              );
            })}
          </div>
          {hosts.length === 0 && !err && (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">Нет локаций.</p>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Карандаш — редактировать (модалка). Тумблер питания скрывает локацию из подписок (перезапуск ядра ~5 сек).
          Использованный трафик точно считается только по мостам — у локаций отдельной статистики нет.
        </p>
      </section>
    </div>
  );
}
