"use client";

import { useState } from "react";
import { ChevronDown, CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TopupBlock() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <Button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <CreditCard />
        Пополнить баланс
        <ChevronDown
          className={cn("transition-transform", open && "rotate-180")}
        />
      </Button>

      {open && (
        <div className="space-y-3 rounded-xl border border-border/60 bg-card/30 p-4 sm:p-5">
          <div>
            <h3 className="text-sm font-semibold">Пополнение баланса</h3>
            <p className="text-xs text-muted-foreground">
              Сейчас оплата отключена — подключим после модерации ЮKassa.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Method title="ЮKassa" description="Карта МИР, СБП, СберPay" disabled />
            <Method title="Криптовалюта" description="USDT TRC-20" disabled />
          </div>
        </div>
      )}
    </div>
  );
}

function Method({
  title,
  description,
  disabled,
}: {
  title: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="text-left rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:bg-card/60 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="font-medium">{title}</div>
      <div className="text-xs text-muted-foreground">{description}</div>
    </button>
  );
}
