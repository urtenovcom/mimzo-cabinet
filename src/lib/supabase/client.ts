import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions:
        typeof window !== "undefined" && window.location.hostname.endsWith("mimzo.ru")
          ? { domain: ".mimzo.ru" }
          : undefined,
    },
  );
}
