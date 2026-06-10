import { Apple, ExternalLink, MonitorSmartphone, Smartphone } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { createClient } from "@/lib/supabase/server";
import type { Subscription } from "@/types/db";

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

export default async function ConnectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sub } = (await supabase
    .from("subscriptions")
    .select("sub_token")
    .eq("user_id", user!.id)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle()) as { data: Pick<Subscription, "sub_token"> | null };

  if (!sub) {
    return (
      <div className="space-y-4">
        <header className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Подключение
          </h1>
          <p className="text-sm text-muted-foreground">
            Сначала оформи подписку, чтобы получить ссылку.
          </p>
        </header>
        <Card>
          <CardContent className="p-6 text-center">
            <Button asChild>
              <a href="/app/vpn/change-plan">Выбрать тариф</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const subUrl = `https://sub.mimzo.ru/sub/${sub.sub_token}`;
  const happUrl = `happ://add/${Buffer.from(subUrl).toString("base64url")}`;

  return (
    <div className="space-y-8">
      <header className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Подключение
        </h1>
        <p className="text-sm text-muted-foreground">
          Скачай Happ → импортируй подписку → выбери сервер → подключайся.
        </p>
      </header>

      {/* Subscription URL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Твоя ссылка-подписка</CardTitle>
          <CardDescription>
            Один URL — все устройства. Импортируй его в Happ.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg border border-border bg-card/60 px-3 py-2.5 text-xs font-mono text-muted-foreground">
              {subUrl}
            </code>
            <CopyButton value={subUrl} />
          </div>
          <Button asChild className="w-full sm:w-auto">
            <a href={happUrl}>Открыть в Happ</a>
          </Button>
        </CardContent>
      </Card>

      {/* Install Happ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Установить Happ</CardTitle>
          <CardDescription>
            Бесплатный клиент. Один раз поставил — больше не нужно ничего настраивать.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3">
          {HAPP_LINKS.map(({ name, href, Icon }) => (
            <Button
              key={name}
              asChild
              variant="outline"
              className="justify-between h-auto py-3"
            >
              <a href={href} target="_blank" rel="noreferrer">
                <span className="inline-flex items-center gap-2">
                  <Icon className="size-4" />
                  {name}
                </span>
                <ExternalLink className="size-4 opacity-50" />
              </a>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Quick guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Как подключиться</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm text-muted-foreground list-decimal pl-5 marker:text-primary">
            <li>Скачай Happ из стора своей платформы.</li>
            <li>
              Скопируй ссылку выше и в Happ выбери «Импорт подписки» → вставь.
            </li>
            <li>Выбери сервер в списке или нажми «Авто».</li>
            <li>Нажми «Подключить». Готово.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
