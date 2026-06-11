"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";

import { bumpPaidUntil } from "@/app/admin/actions";

/**
 * Inline "paid +1 month" button shown next to the payment date so
 * the due date can be bumped without opening the edit modal.
 */
export function PayInline({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      title="Оплачено — сдвинуть на месяц вперёд"
      onClick={() =>
        start(async () => {
          await bumpPaidUntil(id, 1);
          router.refresh();
        })
      }
      className="inline-flex items-center justify-center size-6 rounded-md text-muted-foreground hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <CheckCircle2 className="size-3.5" />
      )}
    </button>
  );
}
