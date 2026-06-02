import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const PROTECTED = [
  "/dashboard",
  "/generate",
  "/campaigns",
  "/calendar",
  "/analytics",
  "/leads",
  "/library",
  "/company",
  "/profile",
  // Legacy routes kept as redirect stubs — still gate them behind auth.
  "/brand",
  "/team",
  "/settings",
];

/**
 * Refresh the Supabase session on every request and gate the app routes.
 * Unauthenticated visitors to protected routes are redirected to /login.
 *
 * Prefetch requests are passed through untouched: the sidebar prefetches every
 * nav link at once, and letting each one refresh (rotate) the Supabase session
 * concurrently can invalidate the refresh token and sign the user out. Real
 * navigations still refresh normally.
 */
export async function middleware(request: NextRequest) {
  const isPrefetch =
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("x-purpose") === "prefetch";
  if (isPrefetch) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (!user && PROTECTED.some((p) => path.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg)$).*)"],
};
