"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  PRIMARY_NAV,
  MORE_NAV,
  MORE_TRIGGER,
  isActive,
  type NavItem,
} from "./nav-items";
import { LogOut } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  // The "More" tab counts as active when we're on any of its child pages
  const moreActive = MORE_NAV.some((item) => isActive(pathname, item));

  async function onLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setSheetOpen(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <nav
      aria-label="Основная навигация"
      className={cn(
        // Fixed at viewport bottom, full width, respects iOS safe area
        "fixed bottom-0 inset-x-0 z-40",
        "border-t border-border/60 bg-background/85 backdrop-blur-md",
        "pb-[env(safe-area-inset-bottom)]",
      )}
    >
      <ul className="mx-auto flex max-w-3xl items-stretch justify-around">
        {PRIMARY_NAV.map((item) => (
          <Tab key={item.href} item={item} active={isActive(pathname, item)} />
        ))}

        {/* "More" — opens bottom sheet, NOT a route */}
        <li className="flex-1">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex w-full flex-col items-center gap-1 py-2.5 text-[11px]",
                  "transition-colors",
                  moreActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <MORE_TRIGGER.Icon className="size-5" aria-hidden />
                <span>{MORE_TRIGGER.label}</span>
              </button>
            </SheetTrigger>

            <SheetContent
              side="bottom"
              className="rounded-t-2xl border-border/60 bg-card/95 backdrop-blur"
            >
              <SheetHeader className="text-left">
                <SheetTitle>Ещё</SheetTitle>
              </SheetHeader>

              <ul className="mt-4 space-y-1">
                {MORE_NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setSheetOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5",
                        "text-sm transition-colors",
                        isActive(pathname, item)
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                      )}
                    >
                      <item.Icon className="size-5" aria-hidden />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}

                <li className="pt-2 mt-2 border-t border-border/60">
                  <button
                    type="button"
                    onClick={onLogout}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5",
                      "text-sm text-destructive transition-colors",
                      "hover:bg-destructive/10",
                    )}
                  >
                    <LogOut className="size-5" aria-hidden />
                    <span>Выйти</span>
                  </button>
                </li>
              </ul>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}

function Tab({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <li className="flex-1">
      <Link
        href={item.href}
        className={cn(
          "flex w-full flex-col items-center gap-1 py-2.5 text-[11px]",
          "transition-colors",
          active
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-current={active ? "page" : undefined}
      >
        <item.Icon className="size-5" aria-hidden />
        <span>{item.label}</span>
      </Link>
    </li>
  );
}
