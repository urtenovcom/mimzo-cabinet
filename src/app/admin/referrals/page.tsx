import Link from "next/link";
import { Share2 } from "lucide-react";

import { getReferralStats } from "@/lib/admin-data";
import { formatRub } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminReferrals() {
  const rows = await getReferralStats();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Рефералы
        </h1>
        <p className="text-sm text-muted-foreground">
          Кто и сколько привёл.
        </p>
      </header>

      <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
        <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr] gap-4 px-5 py-3 text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border/60">
          <span>Реферер</span>
          <span>Приглашено</span>
          <span>Заработано</span>
        </div>
        <ul className="divide-y divide-border/60">
          {rows.map((r) => (
            <li key={r.referrerId}>
              <Link
                href={`/admin/users/${r.referrerId}`}
                className="grid sm:grid-cols-[2fr_1fr_1fr] gap-2 sm:gap-4 px-5 py-3.5 items-center hover:bg-secondary/40 transition-colors"
              >
                <div className="font-medium truncate inline-flex items-center gap-2">
                  <Share2 className="size-3.5 text-muted-foreground" />
                  {r.referrerEmail ?? r.referrerId.slice(0, 8)}
                </div>
                <span className="text-sm tabular-nums">{r.invitedCount} чел.</span>
                <span className="text-sm tabular-nums text-emerald-400">
                  {formatRub(r.totalEarnedRub)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {rows.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            Рефералов пока нет.
          </p>
        )}
      </div>
    </div>
  );
}
