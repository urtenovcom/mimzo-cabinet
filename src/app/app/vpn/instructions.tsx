"use client";

import { useState } from "react";
import {
  Apple,
  BookOpen,
  ChevronDown,
  ExternalLink,
  MonitorSmartphone,
  Smartphone,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const HAPP_LINKS = [
  {
    name: "iOS",
    href: "https://apps.apple.com/us/app/happ-proxy-utility/id6504287215",
    Icon: Apple,
  },
  {
    name: "Android",
    href: "https://play.google.com/store/apps/details?id=com.happproxy",
    Icon: Smartphone,
  },
  {
    name: "Windows / macOS",
    href: "https://happ.su/main/downloads",
    Icon: MonitorSmartphone,
  },
];

export function InstructionsBlock() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "w-full flex items-center justify-between gap-3 rounded-xl",
          "border border-border/60 bg-card/40 px-4 py-3 text-sm",
          "transition-colors hover:bg-card/60",
        )}
      >
        <span className="inline-flex items-center gap-2 font-medium">
          <BookOpen className="size-4 text-primary" />
          Инструкции
        </span>
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="space-y-5 rounded-xl border border-border/60 bg-card/30 p-4 sm:p-5">
          {/* Install */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Установить Happ</h3>
            <p className="text-xs text-muted-foreground">
              Бесплатный клиент. Поставил один раз — настраивать ничего не надо.
            </p>
            <div className="grid sm:grid-cols-3 gap-2">
              {HAPP_LINKS.map(({ name, href, Icon }) => (
                <Button
                  key={name}
                  asChild
                  variant="outline"
                  size="sm"
                  className="justify-between"
                >
                  <a href={href} target="_blank" rel="noreferrer">
                    <span className="inline-flex items-center gap-2">
                      <Icon className="size-4" />
                      {name}
                    </span>
                    <ExternalLink className="size-3.5 opacity-50" />
                  </a>
                </Button>
              ))}
            </div>
          </section>

          {/* How-to */}
          <section className="space-y-2 pt-4 border-t border-border/60">
            <h3 className="text-sm font-semibold">Как подключиться</h3>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-5 marker:text-primary">
              <li>Скачай Happ из стора своей платформы.</li>
              <li>
                Скопируй ссылку выше и в Happ выбери «Импорт подписки» → вставь.
              </li>
              <li>Выбери сервер в списке или нажми «Авто».</li>
              <li>Нажми «Подключить». Готово.</li>
            </ol>
          </section>
        </div>
      )}
    </div>
  );
}
