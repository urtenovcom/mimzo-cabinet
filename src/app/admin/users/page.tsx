import Link from "next/link";
import { Search, ChevronRight } from "lucide-react";

import { listUsers } from "@/lib/admin-data";
import { formatBytes, formatDateShort } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { t: string; c: string }> = {
  active: { t: "активна", c: "text-emerald-400" },
  expired: { t: "истекла", c: "text-amber-400" },
  suspended: { t: "заморожена", c: "text-red-400" },
  none: { t: "нет", c: "text-muted-foreground" },
};

export default async function AdminUsers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const users = await listUsers(q);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Пользователи
        </h1>
        <p className="text-sm text-muted-foreground">
          Всего найдено: {users.length}
        </p>
      </header>

      {/* Search */}
      <form className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Поиск по email…"
          className="w-full rounded-xl border border-border bg-card/60 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/60"
        />
      </form>

      {/* Table */}
      <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
        <div className="hidden md:grid grid-cols-[1.6fr_1fr_1.2fr_0.8fr_0.9fr_auto] gap-4 px-5 py-3 text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border/60">
          <span>Email</span>
          <span>Статус</span>
          <span>Трафик</span>
          <span>Устройства</span>
          <span>Регистрация</span>
          <span></span>
        </div>
        <ul className="divide-y divide-border/60">
          {users.map((u) => {
            const st = STATUS_LABEL[u.status] ?? STATUS_LABEL.none;
            const unlimited = u.trafficGb >= 9999;
            return (
              <li key={u.id}>
                <Link
                  href={`/admin/users/${u.id}`}
                  className="grid md:grid-cols-[1.6fr_1fr_1.2fr_0.8fr_0.9fr_auto] gap-2 md:gap-4 px-5 py-3.5 items-center hover:bg-secondary/40 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {u.email ?? "—"}
                      {u.isTrial && (
                        <span className="ml-2 text-[10px] uppercase text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          демо
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`text-sm ${st.c}`}>{st.t}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {formatBytes(u.trafficUsedBytes)}
                    {" / "}
                    {unlimited ? "∞" : `${u.trafficGb} ГБ`}
                  </span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {u.devicesUsed} / {u.devicesLimit}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatDateShort(u.createdAt)}
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground justify-self-end hidden md:block" />
                </Link>
              </li>
            );
          })}
        </ul>
        {users.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            Ничего не найдено.
          </p>
        )}
      </div>
    </div>
  );
}
