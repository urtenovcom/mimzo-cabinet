import { Activity, Gauge, Cpu, TrendingUp } from "lucide-react";

import { getMonitoring, fmtBps, type ServerLoad } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

function fmtTime(ts: string) {
  return new Date(ts).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pctColor(v: number | null) {
  if (v == null) return "text-muted-foreground";
  if (v >= 85) return "text-red-400";
  if (v >= 65) return "text-amber-400";
  return "text-emerald-400";
}

export default async function AdminMonitoring() {
  const m = await getMonitoring();
  const maxOnline = Math.max(1, ...m.series.map((s) => s.online));

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Мониторинг
        </h1>
        <p className="text-sm text-muted-foreground">
          Онлайн, нагрузка серверов и пики. Снимок каждую минуту.
        </p>
      </header>

      {/* top metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Metric icon={<Activity className="size-4 text-primary" />} label="Онлайн сейчас" value={String(m.current?.online ?? "—")} accent />
        <Metric icon={<Gauge className="size-4" />} label="Скорость наружу" value={fmtBps(m.current?.bwOutBps ?? null)} hint={`вход ${fmtBps(m.current?.bwInBps ?? null)}`} />
        <Metric icon={<TrendingUp className="size-4" />} label="Пик сегодня" value={m.peakToday ? String(m.peakToday.online) : "—"} hint={m.peakToday ? fmtTime(m.peakToday.ts) : undefined} />
        <Metric icon={<TrendingUp className="size-4" />} label="Пик за неделю" value={m.peakWeek ? String(m.peakWeek.online) : "—"} hint={m.peakWeek ? fmtTime(m.peakWeek.ts) : undefined} />
      </div>

      {/* online 24h chart */}
      <div className="rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold">Онлайн за 24 часа</h2>
          <span className="text-xs text-muted-foreground">макс. в окне: {maxOnline}</span>
        </div>
        {m.series.length > 1 ? (
          <div>
            <div className="flex gap-2">
              {/* Y axis */}
              <div className="flex flex-col justify-between h-28 text-[10px] text-muted-foreground tabular-nums text-right w-6 shrink-0">
                <span>{maxOnline}</span>
                <span>{Math.round(maxOnline / 2)}</span>
                <span>0</span>
              </div>
              {/* bars with mid gridline */}
              <div className="relative flex-1">
                <div className="absolute left-0 right-0 top-1/2 border-t border-border/40" />
                <div className="relative flex items-end gap-px h-28">
                  {m.series.map((s, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-primary/60 rounded-t-sm transition-all hover:bg-primary"
                      style={{ height: `${(s.online / maxOnline) * 100}%`, minHeight: "2px" }}
                      title={`${fmtTime(s.ts)}: ${s.online} онлайн`}
                    />
                  ))}
                </div>
              </div>
            </div>
            {/* X axis time labels */}
            <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums mt-1.5 pl-8">
              <span>{fmtTime(m.series[0].ts)}</span>
              <span>{fmtTime(m.series[Math.floor(m.series.length / 2)].ts)}</span>
              <span>{fmtTime(m.series[m.series.length - 1].ts)}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Данные копятся — график появится через несколько минут.
          </p>
        )}
      </div>

      {/* servers load */}
      <section className="space-y-3">
        <h2 className="font-semibold inline-flex items-center gap-2">
          <Cpu className="size-4" />
          Нагрузка серверов сейчас
        </h2>
        <ServerTable servers={m.servers} />
      </section>

      {/* at peak */}
      {m.atPeak && (
        <section className="space-y-3">
          <h2 className="font-semibold inline-flex items-center gap-2">
            <Gauge className="size-4" />
            Нагрузка в пик ({m.atPeak.online} онлайн · {fmtTime(m.atPeak.ts)})
          </h2>
          <ServerTable servers={m.atPeak.servers} />
        </section>
      )}
    </div>
  );
}

function Metric({ icon, label, value, hint, accent }: { icon: React.ReactNode; label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${accent ? "border-primary/40 bg-primary/[0.06]" : "border-border/60 bg-card/40"}`}>
      <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5">{icon}{label}</div>
      <div className="text-2xl font-semibold tabular-nums mt-1">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

function ServerTable({ servers }: { servers: ServerLoad[] }) {
  if (!servers.length) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/40 px-5 py-8 text-center text-sm text-muted-foreground">
        Нет данных (агенты ещё не прислали метрики).
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
      <div className="hidden md:grid grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_0.8fr_1.2fr] gap-4 px-5 py-2.5 text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border/60">
        <span>Сервер</span><span className="text-center">CPU</span><span className="text-center">RAM</span><span className="text-center">Load</span><span className="text-center">Соед.</span><span className="text-right">Трафик ↓/↑</span>
      </div>
      <div className="divide-y divide-border/60">
        {servers.map((s) => (
          <div key={s.ip} className="grid grid-cols-2 md:grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_0.8fr_1.2fr] gap-x-4 gap-y-1 px-5 py-3 items-center">
            <div className="min-w-0">
              <div className="font-medium truncate">{s.name}</div>
              <div className="text-[11px] text-muted-foreground font-mono">{s.ip}</div>
            </div>
            <Cell label="CPU"><span className={`tabular-nums ${pctColor(s.cpu)}`}>{s.cpu != null ? `${s.cpu}%` : "—"}</span></Cell>
            <Cell label="RAM"><span className={`tabular-nums ${pctColor(s.mem)}`}>{s.mem != null ? `${s.mem}%` : "—"}</span></Cell>
            <Cell label="Load"><span className="tabular-nums text-foreground/80">{s.load1 ?? "—"}</span></Cell>
            <Cell label="Соед."><span className="tabular-nums text-foreground/80">{s.conns ?? "—"}</span></Cell>
            <Cell label="Трафик" right>
              <span className="tabular-nums text-foreground/80 text-xs">{fmtBps(s.rxBps)} / {fmtBps(s.txBps)}</span>
            </Cell>
          </div>
        ))}
      </div>
    </div>
  );
}

function Cell({ label, right, children }: { label: string; right?: boolean; children: React.ReactNode }) {
  return (
    <div className={`min-w-0 text-sm ${right ? "md:text-right" : "md:text-center"}`}>
      <span className="md:hidden text-[11px] uppercase tracking-wide text-muted-foreground mr-2">{label}</span>
      {children}
    </div>
  );
}
