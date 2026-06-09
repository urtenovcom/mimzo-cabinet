import {
  Calendar,
  Database,
  ChevronRight,
  Smartphone,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const name = user?.email?.split("@")[0] ?? "друг";

  // ----- MOCK DATA (потом сюда подтянем реальный Marzneshin API) -----
  const subscription = {
    plan: "Демо",
    trafficUsedGB: 0.4,
    trafficTotalGB: 10,
    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // через 3 дня
    devicesUsed: 1,
    devicesLimit: 2,
    subUrl:
      "https://sub.mimzo.ru/sub/dba5c50a5a574d2105cf08e0f3f95a18",
  };
  const trafficPercent =
    (subscription.trafficUsedGB / subscription.trafficTotalGB) * 100;
  const daysLeft = Math.ceil(
    (subscription.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  // -----------------------------------------------------------------

  return (
    <div className="space-y-8">
      {/* Приветствие */}
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight capitalize">
          Привет, {name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Здесь главное о твоей подписке. Управление — слева в меню.
        </p>
      </header>

      {/* Алёрт если трайл */}
      {subscription.plan === "Демо" && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3 p-5">
            <div className="size-10 shrink-0 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
              <Sparkles className="size-5" />
            </div>
            <div className="flex-1">
              <div className="font-medium">
                У тебя демо-доступ — {daysLeft} {plural(daysLeft, ["день", "дня", "дней"])}{" "}
                осталось
              </div>
              <div className="text-sm text-muted-foreground">
                Чтобы продолжить пользоваться без перерывов — выбери тариф
                заранее.
              </div>
            </div>
            <Button asChild>
              <Link href="/app/plans">
                Выбрать тариф
                <ChevronRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Подписка крупным блоком */}
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0 gap-4">
          <div className="space-y-1">
            <CardDescription>Текущий тариф</CardDescription>
            <CardTitle className="text-2xl">{subscription.plan}</CardTitle>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/app/vpn">
              Открыть VPN
              <ChevronRight />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Трафик */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground inline-flex items-center gap-1.5">
                <Database className="size-3.5" />
                Трафик
              </span>
              <span className="tabular-nums">
                <span className="font-medium text-foreground">
                  {subscription.trafficUsedGB.toFixed(1)} ГБ
                </span>
                <span className="text-muted-foreground"> / {subscription.trafficTotalGB} ГБ</span>
              </span>
            </div>
            <Progress value={trafficPercent} />
          </div>

          {/* Сетка фактов */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Stat
              icon={<Calendar className="size-4" />}
              label="Истекает"
              value={`${daysLeft} ${plural(daysLeft, ["день", "дня", "дней"])}`}
              hint={subscription.expiresAt.toLocaleDateString("ru-RU")}
            />
            <Stat
              icon={<Smartphone className="size-4" />}
              label="Устройства"
              value={`${subscription.devicesUsed} / ${subscription.devicesLimit}`}
              hint="используется / лимит"
            />
          </div>
        </CardContent>
      </Card>

      {/* Подписка URL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ссылка-подписка для Happ</CardTitle>
          <CardDescription>
            Вставь эту ссылку в Happ → «Добавить подписку». Она автоматически
            настроит VPN на устройстве.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg border border-border bg-card/60 px-3 py-2.5 text-xs font-mono text-muted-foreground">
              {subscription.subUrl}
            </code>
            <CopyButton value={subscription.subUrl} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4 space-y-1">
      <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function plural(n: number, forms: [string, string, string]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100))
    return forms[1];
  return forms[2];
}
