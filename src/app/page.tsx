import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  // Пока landing'а нет — отправляем в кабинет (или на логин, если не авторизован)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app");
  }
  redirect("/login");
}
