import Link from "next/link";
import {
  Users,
  ShieldCheck,
  Wallet,
  Activity,
  Database,
  Gift,
} from "lucide-react";

import { getOverview, fmtGb } from "@/lib/admin-data";
import { formatRub } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const s = await getOverview();
  const maxSignup = Math.max(1, ...s.signups7d.map((d) => d.count));

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Обзор
        </h1>
        <p className="text-sm text-muted-foreground">
          Сводка по Mimzo в реальном времени.
        </p>
      </header>

      {/* Top metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Metric
          icon={<Users className="size-4" />}
          label="Пользователей"
          value={String(s.totalUsers)}
        />
        <Metric
          icon={<ShieldCheck className="size-4" />}
          label="Активных подписок"
          value={String(s.activeSubs)}
          hint={`${s.trialSubs} демо · ${s.paidSubs} платных`}
        />
        <Metric
          icon={<Activity className="size-4 text-primary" />}
          label="Онлайн сейчас"
          value={String(s.onlineNow)}
          accent
        />
        <Metric
          icon={<Wallet className="size-4" />}
          label="Выручка / месяц"
          value={formatRub(s.revenueMonthRub)}
          hint={`всего ${formatRub(s.revenueTotalRub)}`}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Signups chart */}
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold">Регистрации за 7 дней</h2>
            <span className="text-xs text-muted-foreground">
              {s.signups7d.reduce((a, b) => a + b.count, 0)} новых
            </span>
          </div>
          <div className="flex items-end gap-2 h-36">
            {s.signups7d.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-xs font-medium tabular-nums text-foreground/90">
                  {d.count}
                </span>
                <div className="w-full flex items-end justify-center flex-1">
                  <div
                    className="w-full max-w-[40px] rounded-t-md bg-primary/70 transition-all"
                    style={{ height: `${(d.count / maxSignup) * 100}%`, minHeight: d.count ? "6px" : "2px" }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {d.date.slice(8)}.{d.date.slice(5, 7)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Traffic + servers */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
            <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5 mb-1">
              <Database className="size-3.5" />
              Трафик (суммарно)
            </div>
            <div className="text-2xl font-semibold tabular-nums">
              {fmtGb(s.trafficMonthBytes)}
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
            <div className="text-xs text-muted-foreground mb-3">Серверы</div>
            {s.servers.length ? (
              <ul className="space-y-2">
                {s.servers.map((srv) => (
                  <li
                    key={srv.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate">{srv.name}</span>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs ${
                        srv.healthy ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          srv.healthy ? "bg-emerald-400" : "bg-red-400"
                        }`}
                      />
                      {srv.healthy ? "OK" : srv.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Нет данных</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid sm:grid-cols-3 gap-3">
        <QuickLink href="/admin/users" icon={<Users className="size-4" />} label="Пользователи" />
        <QuickLink href="/admin/promos" icon={<Gift className="size-4" />} label="Промокоды" />
        <QuickLink href="/admin/servers" icon={<ShieldCheck className="size-4" />} label="Серверы" />
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 ${
        accent
          ? "border-primary/40 bg-primary/[0.06]"
          : "border-border/60 bg-card/40"
      }`}
    >
      <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-semibold tabular-nums mt-1">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

function QuickLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 px-4 py-3 text-sm transition-colors hover:bg-card/70 hover:border-primary/40"
    >
      {icon}
      {label}
    </Link>
  );
}
