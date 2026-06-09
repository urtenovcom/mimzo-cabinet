import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { SidebarNav } from "@/components/app/sidebar-nav";
import { UserMenu } from "@/components/app/user-menu";
import { MobileNav } from "@/components/app/mobile-nav";
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

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      {/* Sidebar — десктоп */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:w-64 md:flex-col md:border-r md:border-border/60 md:bg-card/30 md:backdrop-blur">
        <div className="flex h-16 items-center px-6 border-b border-border/60">
          <Link href="/app">
            <Logo />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <SidebarNav />
        </div>
        <div className="border-t border-border/60 p-4 text-[11px] text-muted-foreground leading-snug">
          Mimzo · честный VPN
          <br />
          для российских юзеров
        </div>
      </aside>

      {/* Контент */}
      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 backdrop-blur px-4 sm:px-6">
          <MobileNav />
          <Link href="/app" className="md:hidden">
            <Logo showWordmark={false} size={28} />
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Уведомления">
              <Bell className="size-5" />
            </Button>
            <UserMenu email={user.email ?? ""} />
          </div>
        </header>

        <main className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="mx-auto max-w-5xl w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
