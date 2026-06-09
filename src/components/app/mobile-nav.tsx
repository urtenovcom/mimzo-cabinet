"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Logo } from "@/components/brand/logo";
import { SidebarNav } from "./sidebar-nav";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Открыть меню"
      >
        <Menu className="size-5" />
      </Button>
      <SheetContent side="left" className="p-0">
        <div className="flex h-full flex-col">
          <div className="px-6 py-5 border-b border-border/60">
            <SheetTitle asChild>
              <Logo />
            </SheetTitle>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <SidebarNav onNavigate={() => setOpen(false)} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
