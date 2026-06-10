"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export interface SignInResult {
  error?: string;
}

/**
 * Server-side sign-in. Cookies are written by the Next.js cookie API
 * with explicit `domain=.mimzo.ru` (see lib/supabase/server.ts), so
 * mobile Chrome — which is picky about cookie attributes on
 * document.cookie writes — receives them correctly on the redirect.
 */
export async function signInAction(
  email: string,
  password: string,
): Promise<SignInResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: translateError(error.message) };
  }

  // Server-side redirect — the same response that carries Set-Cookie
  // also returns 303 to the app host, so the browser stores cookies
  // before following the redirect to app.mimzo.ru.
  redirect("https://app.mimzo.ru/app");
}

function translateError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Неверный email или пароль.";
  }
  if (lower.includes("email not confirmed")) {
    return "Email не подтверждён. Открой письмо и нажми на ссылку.";
  }
  if (lower.includes("rate limit")) {
    return "Слишком много попыток. Подожди минуту и попробуй ещё раз.";
  }
  return msg;
}
