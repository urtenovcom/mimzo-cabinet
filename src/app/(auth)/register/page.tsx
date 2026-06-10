"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Loader2, AlertCircle, CheckCircle2, Sparkles } from "lucide-react";

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

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterFormSkeleton />}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterFormSkeleton() {
  return (
    <Card className="border-border/60">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl">Создать аккаунт</CardTitle>
      </CardHeader>
      <CardContent className="flex justify-center py-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

function RegisterForm() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password.length < 8) {
      setError("Пароль должен быть минимум 8 символов.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: "https://app.mimzo.ru/app",
        data: refCode ? { ref_code: refCode } : undefined,
      },
    });

    if (error) {
      setError(translateError(error.message));
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <Card className="border-border/60">
        <CardHeader className="space-y-2 items-center text-center">
          <div className="size-12 rounded-full bg-primary/15 flex items-center justify-center">
            <CheckCircle2 className="size-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Почти готово</CardTitle>
          <CardDescription>
            Мы отправили письмо на <b className="text-foreground">{email}</b>.
            Перейди по ссылке из письма чтобы подтвердить email и войти.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full"
          >
            <Link href="/login">Вернуться ко входу</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl">Создать аккаунт</CardTitle>
        <CardDescription>
          После регистрации сразу получишь{" "}
          <span className="text-primary font-medium">3 дня бесплатно</span> —
          без карты, без подвоха.
        </CardDescription>
        {refCode && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs text-primary">
            <Sparkles className="size-3.5" />
            Регистрация по приглашению
          </div>
        )}
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
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="минимум 8 символов"
              required
              minLength={8}
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
            Зарегистрироваться
          </Button>

          <p className="text-center text-xs text-muted-foreground leading-relaxed">
            Создавая аккаунт, ты соглашаешься с{" "}
            <Link href="/terms" className="hover:text-foreground transition-colors underline-offset-2 hover:underline">
              условиями
            </Link>{" "}
            и{" "}
            <Link href="/privacy" className="hover:text-foreground transition-colors underline-offset-2 hover:underline">
              политикой конфиденциальности
            </Link>.
          </p>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Уже есть аккаунт?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground hover:text-primary transition-colors"
          >
            Войти
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function translateError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("user already registered") || lower.includes("already exists")) {
    return "Аккаунт с этим email уже существует. Попробуй войти.";
  }
  if (lower.includes("invalid email")) {
    return "Email указан некорректно.";
  }
  if (lower.includes("password")) {
    return "Пароль слишком короткий или простой.";
  }
  return msg;
}
