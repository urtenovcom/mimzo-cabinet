"use client";

import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon, Settings } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

interface UserMenuProps {
  email: string;
}

export function UserMenu({ email }: UserMenuProps) {
  const router = useRouter();
  const initial = email.charAt(0).toUpperCase();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-secondary/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <div className="size-8 rounded-full bg-gradient-to-br from-[#41FEAA] to-emerald-500 flex items-center justify-center text-sm font-semibold text-background">
          {initial}
        </div>
        <span className="hidden sm:inline text-sm font-medium truncate max-w-[160px]">
          {email}
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/app/settings">
            <Settings />
            Настройки
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/app/settings/profile">
            <UserIcon />
            Профиль
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
          <LogOut />
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
