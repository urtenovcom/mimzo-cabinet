import { getFinance } from "@/lib/admin-data";
import { formatRub, formatDateShort } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { t: string; c: string }> = {
  succeeded: { t: "успешно", c: "text-emerald-400" },
  pending: { t: "ожидается", c: "text-amber-400" },
  cancelled: { t: "отменено", c: "text-muted-foreground" },
  failed: { t: "ошибка", c: "text-red-400" },
};

export default async function AdminFinance() {
  const f = await getFinance();
  const maxRub = Math.max(1, ...f.revenueByDay.map((d) => d.rub));

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Финансы
        </h1>
        <p className="text-sm text-muted-foreground">
          Выручка и операции.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5">
          <div className="text-xs text-muted-foreground">Выручка всего</div>
          <div className="text-2xl font-semibold tabular-nums mt-1">{formatRub(f.totalRub)}</div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5">
          <div className="text-xs text-muted-foreground">Платных операций</div>
          <div className="text-2xl font-semibold tabular-nums mt-1">{f.paidCount}</div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5">
          <div className="text-xs text-muted-foreground">Промокодов выдано</div>
          <div className="text-2xl font-semibold tabular-nums mt-1">{f.promoCount}</div>
        </div>
      </div>

      {/* Revenue chart */}
      <div className="rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold">Выручка за 30 дней</h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            макс. в день: {formatRub(maxRub)}
          </span>
        </div>
        {f.revenueByDay.some((d) => d.rub > 0) ? (
          <div>
            <div className="flex gap-2">
              <div className="flex flex-col justify-between h-32 text-[10px] text-muted-foreground tabular-nums text-right w-12 shrink-0">
                <span>{formatRub(maxRub)}</span>
                <span>0</span>
              </div>
              <div className="flex items-end gap-1 h-32 flex-1">
                {f.revenueByDay.map((d) => (
                  <div
                    key={d.date}
                    className="flex-1 bg-primary/60 rounded-t-sm transition-all hover:bg-primary"
                    style={{ height: `${(d.rub / maxRub) * 100}%`, minHeight: d.rub ? "4px" : "2px" }}
                    title={`${d.date}: ${formatRub(d.rub)}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums mt-1.5 pl-14">
              <span>{f.revenueByDay[0]?.date.slice(8)}.{f.revenueByDay[0]?.date.slice(5, 7)}</span>
              <span>сегодня</span>
            </div>
          </div>
        ) : (
          <div className="h-28 flex items-center justify-center text-sm text-muted-foreground">
            Пока нет платежей — выручки за период нет
          </div>
        )}
      </div>

      {/* Payments */}
      <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
        <div className="px-5 py-3 text-sm font-semibold border-b border-border/60">
          Последние операции
        </div>
        <ul className="divide-y divide-border/60">
          {f.payments.map((p) => {
            const st = STATUS[p.status] ?? STATUS.pending;
            return (
              <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate">{p.email ?? "—"}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {p.provider}
                    {p.provider === "promo" && (p.metadata as { promo_code?: string })?.promo_code
                      ? ` · ${(p.metadata as { promo_code?: string }).promo_code}`
                      : ""}{" "}
                    · {formatDateShort(p.created_at)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="tabular-nums font-medium">
                    {p.amount_rub > 0 ? formatRub(p.amount_rub) : "—"}
                  </div>
                  <div className={`text-[11px] ${st.c}`}>{st.t}</div>
                </div>
              </li>
            );
          })}
        </ul>
        {f.payments.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">Операций нет.</p>
        )}
      </div>
    </div>
  );
}
