import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Two faces of the same Next.js app:
//   mimzo.ru        → marketing / auth (login, register, forgot, reset)
//   app.mimzo.ru    → authed cabinet (/app/*)
// Cookies are scoped to `.mimzo.ru`. If a mobile browser drops the
// cookie at the subdomain boundary we degrade gracefully — the worst
// case is the user lands on /login again, not an infinite redirect.
const AUTH_HOST = "mimzo.ru";
const APP_HOST = "app.mimzo.ru";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              domain: ".mimzo.ru",
            }),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl;
  const host = request.headers.get("host") ?? "";

  const isAuthPath =
    url.pathname === "/login" ||
    url.pathname === "/register" ||
    url.pathname === "/forgot-password" ||
    url.pathname === "/reset-password";
  const isAppPath = url.pathname.startsWith("/app");

  // Marketing host serving an app path → bounce to app subdomain.
  if (host === AUTH_HOST && isAppPath) {
    return NextResponse.redirect(
      `https://${APP_HOST}${url.pathname}${url.search}`,
    );
  }

  // App host serving an auth path → bounce to marketing host.
  if (host === APP_HOST && isAuthPath) {
    return NextResponse.redirect(
      `https://${AUTH_HOST}${url.pathname}${url.search}`,
    );
  }

  // App pages require an authed user.
  // The reverse rule (auth path while logged in → /app) is intentionally
  // omitted: it forms an infinite loop if cookies don't propagate across
  // subdomains (some mobile browsers). Users that visit /login while
  // already authed will just see the login form — annoying, not broken.
  if (isAppPath && !user) {
    return NextResponse.redirect(`https://${AUTH_HOST}/login`);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sub/|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
