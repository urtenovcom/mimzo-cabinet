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
        <h2 className="font-semibold mb-5">Выручка за 30 дней</h2>
        <div className="flex items-end gap-1 h-32">
          {f.revenueByDay.map((d) => (
            <div
              key={d.date}
              className="flex-1 bg-primary/60 rounded-t-sm transition-all hover:bg-primary"
              style={{ height: `${(d.rub / maxRub) * 100}%`, minHeight: "2px" }}
              title={`${d.date}: ${formatRub(d.rub)}`}
            />
          ))}
        </div>
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
