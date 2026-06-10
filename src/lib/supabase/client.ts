import { createBrowserClient } from "@supabase/ssr";

// Cookie domain is hard-coded so it's set the same way no matter which
// subdomain (mimzo.ru / app.mimzo.ru) the user is on, and even before
// `window` becomes available during hydration.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        domain: ".mimzo.ru",
        path: "/",
        sameSite: "lax",
        secure: true,
      },
    },
  );
}
