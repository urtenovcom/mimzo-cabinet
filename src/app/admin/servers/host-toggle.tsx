"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, Power } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toggleHost } from "@/app/admin/actions";

export function HostToggle({
  inboundTag,
  disabled,
}: {
  inboundTag: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await toggleHost(inboundTag, !disabled);
          router.refresh();
        })
      }
      title={disabled ? "Включить (перезапустит ядро)" : "Выключить (перезапустит ядро)"}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Power className={`size-4 ${disabled ? "text-muted-foreground" : "text-emerald-400"}`} />
      )}
    </Button>
  );
}
