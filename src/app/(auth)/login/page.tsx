"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(translateError(error.message));
      setLoading(false);
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl">Вход в кабинет</CardTitle>
        <CardDescription>
          Введи email и пароль чтобы продолжить пользоваться Mimzo.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="ivan@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Пароль</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Забыли?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Войти
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Нет аккаунта?{" "}
          <Link
            href="/register"
            className="font-medium text-foreground hover:text-primary transition-colors"
          >
            Создать
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function translateError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Неверный email или пароль.";
  }
  if (lower.includes("email not confirmed")) {
    return "Email ещё не подтверждён. Проверь почту.";
  }
  if (lower.includes("too many requests")) {
    return "Слишком много попыток. Подожди минуту.";
  }
  return msg;
}
