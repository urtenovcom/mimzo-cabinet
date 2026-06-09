import { AtSign, Calendar } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import type { Profile } from "@/types/db";

import { LogoutButton } from "./logout-button";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = (await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .maybeSingle()) as { data: Profile | null };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Настройки
        </h1>
        <p className="text-sm text-muted-foreground">
          Профиль, безопасность и предпочтения.
        </p>
      </header>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Профиль</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row
            icon={<AtSign className="size-4" />}
            label="Email"
            value={user?.email ?? "—"}
          />
          <Row
            icon={<Calendar className="size-4" />}
            label="Аккаунт создан"
            value={profile?.created_at ? formatDate(profile.created_at) : "—"}
          />
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Безопасность</CardTitle>
          <CardDescription>
            Смена пароля и удаление аккаунта.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" disabled>
            Сменить пароль (скоро)
          </Button>
          <Button variant="ghost" disabled className="text-destructive">
            Удалить аккаунт (скоро)
          </Button>
        </CardContent>
      </Card>

      {/* Logout */}
      <Card>
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <div className="font-medium">Выход</div>
            <div className="text-sm text-muted-foreground">
              Завершит текущую сессию на этом устройстве.
            </div>
          </div>
          <LogoutButton />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
