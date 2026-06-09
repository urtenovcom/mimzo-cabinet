"use client";

import { useState, useTransition } from "react";
import { Loader2, RotateCw, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { rotateSubscription } from "./actions";

export function RotateSubButton() {
  const [pending, startTransition] = useTransition();
  const [stage, setStage] = useState<"idle" | "confirm">("idle");

  function onConfirm() {
    startTransition(async () => {
      await rotateSubscription();
      setStage("idle");
    });
  }

  if (stage === "idle") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setStage("confirm")}
        className="text-muted-foreground hover:text-foreground"
      >
        <RotateCw />
        Перевыпустить
      </Button>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
      <div className="flex items-start gap-2 flex-1">
        <AlertTriangle className="size-4 shrink-0 mt-0.5 text-destructive" />
        <span>
          После сброса <b>старая ссылка перестанет работать</b> и Happ на всех
          устройствах потеряет VPN. Тебе придётся импортировать <b>новую</b>{" "}
          ссылку заново.
        </span>
      </div>
      <div className="flex gap-1 self-end sm:self-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setStage("idle")}
          disabled={pending}
        >
          Отмена
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onConfirm}
          disabled={pending}
        >
          {pending && <Loader2 className="animate-spin" />}
          Точно сбросить
        </Button>
      </div>
    </div>
  );
}
