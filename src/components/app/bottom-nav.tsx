"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { PRIMARY_NAV, isActive, type NavItem } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Основная навигация"
      className={cn(
        "fixed bottom-0 inset-x-0 z-40",
        "border-t border-border/60 bg-background/85 backdrop-blur-md",
        "pb-[env(safe-area-inset-bottom)]",
      )}
    >
      <ul className="mx-auto flex max-w-3xl items-stretch justify-around">
        {PRIMARY_NAV.map((item) => (
          <Tab key={item.href} item={item} active={isActive(pathname, item)} />
        ))}
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
          "flex w-full flex-col items-center gap-1 py-2.5 text-[11px] transition-colors",
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
