import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Smartphone, Wallet, Ticket, Share2 } from "lucide-react";

import { getUserDetail } from "@/lib/admin-data";
import {
  formatBytes,
  formatDate,
  formatDateShort,
  formatDaysLeft,
  formatRub,
} from "@/lib/format";
import { UserActions } from "./user-actions";

export const dynamic = "force-dynamic";

export default async function AdminUserDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const d = await getUserDetail(id);
  if (!d) notFound();

  const sub = d.subscription;
  const unlimited = (sub?.traffic_gb ?? 0) >= 9999;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Все пользователи
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight break-all">
          {d.profile.email ?? "—"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Зарегистрирован {formatDate(d.profile.created_at)} · ID{" "}
          <span className="font-mono text-xs">{d.profile.id.slice(0, 8)}</span>
        </p>
      </header>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: info */}
        <div className="space-y-6">
          {/* Subscription */}
          <Section title="Подписка">
            {sub ? (
              <dl className="space-y-2.5 text-sm">
                <Row k="Тариф" v={sub.is_trial ? "Демо" : "Платный"} />
                <Row
                  k="Статус"
                  v={
                    sub.status === "active"
                      ? "активна"
                      : sub.status === "suspended"
                        ? "заморожена"
                        : "истекла"
                  }
                />
                <Row
                  k="Трафик"
                  v={`${formatBytes(sub.traffic_used_bytes)} / ${unlimited ? "Безлимит" : `${sub.traffic_gb} ГБ`}`}
                />
                <Row k="Устройств лимит" v={String(sub.devices_limit)} />
                <Row
                  k="Истекает"
                  v={`${formatDaysLeft(sub.expires_at)} (${formatDate(sub.expires_at)})`}
                />
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">Подписки нет</p>
            )}
          </Section>

          {/* Balance */}
          <Section title="Баланс">
            <dl className="space-y-2.5 text-sm">
              <Row
                k="Текущий баланс"
                v={<span className="text-primary">{formatRub(d.profile.balance_rub)}</span>}
                icon={<Wallet className="size-3.5" />}
              />
            </dl>
          </Section>

          {/* Referrals */}
          <Section title="Рефералы">
            <dl className="space-y-2.5 text-sm">
              <Row
                k="Пригласил его"
                v={
                  d.referredBy ? (
                    <Link href={`/admin/users/${d.referredBy.id}`} className="text-primary hover:underline">
                      {d.referredBy.email ?? d.referredBy.id.slice(0, 8)}
                    </Link>
                  ) : (
                    "—"
                  )
                }
                icon={<Share2 className="size-3.5" />}
              />
              <Row k="Привёл людей" v={`${d.referrals.length} чел.`} />
              <Row
                k="Заработал с них"
                v={<span className="text-emerald-400">{formatRub(d.referralEarnedRub)}</span>}
              />
            </dl>
            {d.referrals.length > 0 && (
              <ul className="mt-3 pt-3 border-t border-border/60 divide-y divide-border/60">
                {d.referrals.map((r) => (
                  <li key={r.id} className="py-2 flex items-center justify-between gap-2 text-sm">
                    <Link href={`/admin/users/${r.id}`} className="truncate hover:text-primary">
                      {r.email ?? r.id.slice(0, 8)}
                    </Link>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {formatDateShort(r.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Devices */}
          <Section title={`Устройства (${d.devices.length})`}>
            {d.devices.length ? (
              <ul className="divide-y divide-border/60 -my-1">
                {d.devices.map((dev) => (
                  <li key={dev.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate inline-flex items-center gap-2">
                        <Smartphone className="size-3.5 text-muted-foreground" />
                        {dev.display_name ?? dev.client_app ?? "Устройство"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {[dev.os, dev.client_app, formatDateShort(dev.last_seen)]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground uppercase">
                      {dev.device_hash.slice(-8)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Нет устройств</p>
            )}
          </Section>

          {/* Payments */}
          <Section title={`История (${d.payments.length})`}>
            {d.payments.length ? (
              <ul className="divide-y divide-border/60 -my-1">
                {d.payments.map((p) => (
                  <li key={p.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                    <div className="inline-flex items-center gap-2">
                      <Ticket className="size-3.5 text-muted-foreground" />
                      <span>
                        {p.provider === "promo"
                          ? `Промокод ${(p.metadata as { promo_code?: string })?.promo_code ?? ""}`
                          : p.purpose}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="tabular-nums font-medium">
                        {p.amount_rub > 0 ? formatRub(p.amount_rub) : "—"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {formatDateShort(p.created_at)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Операций нет</p>
            )}
          </Section>
        </div>

        {/* Right: actions */}
        <div>
          <Section title="Действия">
            <UserActions
              userId={d.profile.id}
              status={sub?.status ?? "none"}
              devicesLimit={sub?.devices_limit ?? 2}
            />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
      <h2 className="text-sm font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Row({
  k,
  v,
  icon,
}: {
  k: string;
  v: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground inline-flex items-center gap-1.5">
        {icon}
        {k}
      </dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}
