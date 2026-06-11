import Link from "next/link";
import { notFound } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Ticket,
  Server,
  Wallet,
  Share2,
  ExternalLink,
} from "lucide-react";

import { requireAdmin } from "@/lib/admin";
import { Logo } from "@/components/brand/logo";

const NAV = [
  { href: "/admin", label: "Обзор", Icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Пользователи", Icon: Users },
  { href: "/admin/promos", label: "Промокоды", Icon: Ticket },
  { href: "/admin/servers", label: "Серверы", Icon: Server },
  { href: "/admin/finance", label: "Финансы", Icon: Wallet },
  { href: "/admin/referrals", label: "Рефералы", Icon: Share2 },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const email = await requireAdmin();
  if (!email) notFound(); // never reveal /admin exists to non-admins

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col border-r border-border/60 bg-card/30 sticky top-0 h-screen">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-border/60">
          <Logo size={26} />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Admin
          </span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors"
            >
              <n.Icon className="size-4" />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-border/60 space-y-1">
          <Link
            href="/app"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="size-3.5" />
            Кабинет
          </Link>
          <div className="px-3 text-[11px] text-muted-foreground/70 truncate">
            {email}
          </div>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden h-14 flex items-center gap-2 px-4 border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-30">
          <Logo size={24} />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Admin
          </span>
        </header>
        <div className="md:hidden flex gap-1 overflow-x-auto px-3 py-2 border-b border-border/60 sticky top-14 z-20 bg-background/80 backdrop-blur">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary/60"
            >
              {n.label}
            </Link>
          ))}
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
