import { Server, Globe } from "lucide-react";

import { getNodes, getHosts } from "@/lib/admin-data";
import { HostToggle } from "./host-toggle";

export const dynamic = "force-dynamic";

export default async function AdminServers() {
  let nodes: Awaited<ReturnType<typeof getNodes>> = [];
  let hosts: Awaited<ReturnType<typeof getHosts>> = [];
  let err: string | null = null;
  try {
    [nodes, hosts] = await Promise.all([getNodes(), getHosts()]);
  } catch (e) {
    err = String(e);
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Серверы
        </h1>
        <p className="text-sm text-muted-foreground">
          Ноды-мосты и локации-выходы из Marzban.
        </p>
      </header>

      {err && (
        <p className="text-sm text-destructive">
          Не удалось получить данные Marzban: {err}
        </p>
      )}

      {/* Nodes (bridges) */}
      <section className="space-y-4">
        <h2 className="font-semibold inline-flex items-center gap-2">
          <Server className="size-4" />
          Мосты (ноды)
        </h2>
        <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
          <ul className="divide-y divide-border/60">
            {nodes.map((n) => {
              const healthy = n.status === "connected";
              return (
                <li key={n.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{n.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {n.address}
                      {n.xray_version ? ` · xray ${n.xray_version}` : ""}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs ${
                      healthy ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    <span className={`size-1.5 rounded-full ${healthy ? "bg-emerald-400" : "bg-red-400"}`} />
                    {healthy ? "подключён" : n.status}
                  </span>
                </li>
              );
            })}
          </ul>
          {nodes.length === 0 && !err && (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">Нет нод.</p>
          )}
        </div>
      </section>

      {/* Hosts (exit locations) */}
      <section className="space-y-4">
        <h2 className="font-semibold inline-flex items-center gap-2">
          <Globe className="size-4" />
          Локации (выходы)
        </h2>
        <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
          <ul className="divide-y divide-border/60">
            {hosts.map((h) => (
              <li key={h.inboundTag} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <div className={`font-medium truncate ${h.is_disabled ? "text-muted-foreground line-through" : ""}`}>
                    {h.remark}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {h.address} · {h.inboundTag}
                  </div>
                </div>
                <HostToggle inboundTag={h.inboundTag} disabled={h.is_disabled} />
              </li>
            ))}
          </ul>
          {hosts.length === 0 && !err && (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">Нет локаций.</p>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Выключение локации перезапускает ядро Marzban (~5 сек) и убирает сервер из подписок.
        </p>
      </section>
    </div>
  );
}
