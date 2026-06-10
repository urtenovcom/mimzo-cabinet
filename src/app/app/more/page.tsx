import Link from "next/link";
import { ChevronRight, LogOut } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MORE_NAV } from "@/components/app/nav-items";
import { logoutAction } from "./actions";

export default function MorePage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Ещё
        </h1>
        <p className="text-sm text-muted-foreground">
          Сообщество, поддержка, настройки аккаунта.
        </p>
      </header>

      <Card>
        <CardContent className="p-2 sm:p-2">
          <ul className="divide-y divide-border/60">
            {MORE_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-3 sm:px-4 py-3.5 transition-colors hover:bg-secondary/60 rounded-lg"
                >
                  <span className="grid size-9 place-items-center rounded-lg bg-secondary/70 text-foreground">
                    <item.Icon className="size-4" aria-hidden />
                  </span>
                  <span className="flex-1 font-medium">{item.label}</span>
                  <ChevronRight
                    className="size-4 text-muted-foreground"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Аккаунт</CardTitle>
          <CardDescription>Выйти из текущей сессии.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="ghost"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut />
              Выйти
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
