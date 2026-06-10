import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Two faces of the same Next.js app:
//   mimzo.ru        → marketing / auth (login, register, forgot-password, reset-password)
//   app.mimzo.ru    → authed cabinet (/app/*)
// Cookies are scoped to `.mimzo.ru` (set in supabase server / browser clients)
// so the Supabase session survives the cross-subdomain redirect after login.
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

  // 1) On marketing host: app paths bounce to app subdomain
  if (host === AUTH_HOST && isAppPath) {
    return NextResponse.redirect(`https://${APP_HOST}${url.pathname}${url.search}`);
  }

  // 2) On app host: auth paths bounce to marketing host
  if (host === APP_HOST && isAuthPath) {
    return NextResponse.redirect(`https://${AUTH_HOST}${url.pathname}${url.search}`);
  }

  // 3) Standard auth gating (works on both hosts now)
  if (isAppPath && !user) {
    return NextResponse.redirect(`https://${AUTH_HOST}/login`);
  }
  if (isAuthPath && user) {
    return NextResponse.redirect(`https://${APP_HOST}/app`);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sub/|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
