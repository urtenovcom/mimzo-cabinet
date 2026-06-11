import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { BottomNav } from "@/components/app/bottom-nav";
import { UserMenu } from "@/components/app/user-menu";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top header — logo · bell (reserved) · avatar */}
      <header
        className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4 sm:px-6">
          <Link
            href="/app"
            aria-label="Mimzo · на главную"
            className="inline-flex"
          >
            <Logo size={42} />
          </Link>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              aria-label="Уведомления (скоро)"
              disabled
              className="grid size-9 place-items-center rounded-full text-muted-foreground/60 cursor-not-allowed"
            >
              <Bell className="size-5" />
            </button>
            <UserMenu email={user.email ?? ""} />
          </div>
        </div>
      </header>

      {/* Page content — extra bottom padding for the fixed nav */}
      <main className="flex-1 px-4 sm:px-6 pt-6 pb-28">
        <div className="mx-auto max-w-3xl w-full">{children}</div>
      </main>

      <BottomNav />
    </div>
  );
}
