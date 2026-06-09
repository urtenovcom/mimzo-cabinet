"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <Card className="border-border/60">
        <CardHeader className="space-y-2 items-center text-center">
          <div className="size-12 rounded-full bg-primary/15 flex items-center justify-center">
            <CheckCircle2 className="size-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Письмо отправлено</CardTitle>
          <CardDescription>
            Если такой email зарегистрирован — на него уже летит ссылка для
            сброса. Открой её в течение часа.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/login">Вернуться ко входу</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl">Восстановить пароль</CardTitle>
        <CardDescription>
          Введи свой email — пришлём ссылку для смены пароля.
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

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Отправить ссылку
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Вспомнил?{" "}
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
