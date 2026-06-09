import { Check, ShieldCheck, Zap } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { formatGb, formatRub } from "@/lib/format";
import type { Plan } from "@/types/db";

const FAMILY_LABELS: Record<string, string> = {
  basic: "Базовый",
  pro: "Премиум",
};

export default async function PlansPage() {
  const supabase = await createClient();
  const { data: plans } = (await supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")) as { data: Plan[] | null };

  // group plans by family (basic / pro)
  const families = (plans ?? []).reduce<Record<string, Plan[]>>((acc, p) => {
    const family = p.code.split("_")[0];
    if (!acc[family]) acc[family] = [];
    acc[family].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Тарифы
        </h1>
        <p className="text-sm text-muted-foreground">
          Выбери план под себя. Чем длиннее — тем дешевле в месяц.
        </p>
      </header>

      {Object.entries(families).map(([family, familyPlans]) => (
        <section key={family} className="space-y-4">
          <div className="flex items-center gap-2">
            {family === "pro" ? (
              <Zap className="size-5 text-primary" />
            ) : (
              <ShieldCheck className="size-5 text-muted-foreground" />
            )}
            <h2 className="text-xl font-semibold">
              {FAMILY_LABELS[family] ?? family}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {familyPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                highlighted={plan.code.endsWith("_3m")}
              />
            ))}
          </div>
        </section>
      ))}

      <p className="text-xs text-muted-foreground text-center">
        Оплата в рублях через ЮKassa. Промокод — на странице{" "}
        <a href="/app/billing" className="text-primary hover:underline">
          Финансы
        </a>
        .
      </p>
    </div>
  );
}

function PlanCard({ plan, highlighted }: { plan: Plan; highlighted?: boolean }) {
  const months = Math.round(plan.duration_days / 30);
  const pricePerMonth = Math.round(plan.price_rub / months);
  const unlimited = plan.traffic_gb >= 9999;
  const isLong = months >= 3;

  return (
    <Card
      className={
        highlighted ? "border-primary/60 relative overflow-hidden" : ""
      }
    >
      {highlighted && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-bl-lg">
          Популярный
        </div>
      )}
      <CardHeader>
        <CardDescription>
          {months} {plural(months, ["месяц", "месяца", "месяцев"])}
        </CardDescription>
        <CardTitle className="text-2xl">{formatRub(plan.price_rub)}</CardTitle>
        {isLong && (
          <div className="text-xs text-muted-foreground">
            ≈ {formatRub(pricePerMonth)} / месяц
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2 text-sm">
          <Feature>
            {unlimited
              ? "Безлимитный трафик"
              : `${formatGb(plan.traffic_gb)} трафика`}
          </Feature>
          <Feature>
            {plan.devices_limit}{" "}
            {plural(plan.devices_limit, [
              "устройство",
              "устройства",
              "устройств",
            ])}
          </Feature>
          <Feature>Все локации</Feature>
          <Feature>Поддержка 24/7</Feature>
        </ul>
        <Button className="w-full" disabled>
          Выбрать (скоро)
        </Button>
      </CardContent>
    </Card>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="size-4 text-emerald-500 mt-0.5 shrink-0" />
      <span>{children}</span>
    </li>
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
