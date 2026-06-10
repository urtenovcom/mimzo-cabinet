import Link from "next/link";
import { CreditCard } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function TopupPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="space-y-2">
        <div className="text-sm">
          <Link
            href="/app/billing"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Назад к финансам
          </Link>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Пополнение баланса
        </h1>
        <p className="text-sm text-muted-foreground">
          Выбери способ оплаты. После пополнения сумма зачислится мгновенно.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg inline-flex items-center gap-2">
            <CreditCard className="size-4" />
            Способы оплаты
          </CardTitle>
          <CardDescription>
            Сейчас оплата отключена — подключим после модерации ЮKassa.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <Method title="ЮKassa" description="Карта МИР, СБП, СберPay" disabled />
          <Method title="Криптовалюта" description="USDT TRC-20" disabled />
        </CardContent>
      </Card>
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
