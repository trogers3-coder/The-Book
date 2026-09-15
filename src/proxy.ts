import { NextRequest, NextResponse } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase-auth";

// Paths reachable without a logged-in session: the login page/action, and
// the cron-triggered sync endpoint (which authenticates via a bearer
// secret instead of a session, since no browser session is involved).
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/cron/sync"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next({ request });

  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"))) {
    return response;
  }

  // getUser() (not getSession()) revalidates the token against Supabase
  // Auth rather than trusting an unverified local JWT.
  const supabase = createSupabaseMiddlewareClient(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return response;
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  const redirect = NextResponse.redirect(loginUrl);
  for (const cookie of response.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
