"use client";

import { FormEvent, useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { redeemPromo, type RedeemPromoResult } from "./actions";

export function PromoForm() {
  const [pending, startTransition] = useTransition();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<RedeemPromoResult | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setResult(null);
    startTransition(async () => {
      const res = await redeemPromo(code);
      setResult(res);
      if (res.ok) setCode("");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="promo">Код</Label>
          <Input
            id="promo"
            placeholder="WELCOME"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            disabled={pending}
          />
        </div>
        <Button
          type="submit"
          className="sm:self-end"
          disabled={pending || code.trim().length < 2}
        >
          {pending && <Loader2 className="animate-spin" />}
          Применить
        </Button>
      </div>

      {result?.error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{result.error}</span>
        </div>
      )}

      {result?.ok && result.applied && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-medium">Промокод применён</div>
            <div className="text-xs text-emerald-300/80">
              {[
                result.applied.days_added > 0 &&
                  `+${result.applied.days_added} дней`,
                result.applied.traffic_gb_added > 0 &&
                  `+${result.applied.traffic_gb_added} ГБ`,
                result.applied.devices_added > 0 &&
                  `+${result.applied.devices_added} устройств`,
              ]
                .filter(Boolean)
                .join(" · ") || "Тариф обновлён"}
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
