import { createServerClient } from "@supabase/ssr";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_URL_PREFIXES, routing } from "@/i18n/routing";
import { publicEnv } from "@/lib/env";

const handleI18nRouting = createIntlMiddleware(routing);

// Pages that need a signed-in user. Signed-out visitors are sent straight to
// login from here (fast, server-side). The real check still happens in each
// page via requireUser()/requireRole(); this is only an optimistic shortcut.
const PROTECTED_PREFIXES = [
  "/account",
  "/reset-password",
  "/customer",
  "/host",
  "/admin",
];

const localePrefixes: string[] = Object.values(LOCALE_URL_PREFIXES);

/** Splits "/pt/account" into { prefix: "/pt", path: "/account" }. */
function splitLocalePrefix(pathname: string) {
  const prefix = localePrefixes.find(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  return prefix
    ? { prefix, path: pathname.slice(prefix.length) || "/" }
    : { prefix: "", path: pathname };
}

function isProtected(path: string) {
  return PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * Runs before every page request:
 *  1. Refreshes the Supabase session if the access token expired, writing the
 *     new cookies into the *request* so this same render sees them.
 *  2. Applies locale routing (adds/strips the /pt prefix). next-intl forwards
 *     the request headers, including the refreshed cookies.
 *  3. Copies the new Set-Cookie and no-cache headers onto the final response.
 *
 * This is NOT where authorization happens; layouts check roles and RLS
 * protects the data. The proxy only keeps the session fresh.
 */
export async function proxy(request: NextRequest) {
  const cookiesToWrite: { name: string; value: string; options: object }[] = [];
  let cacheHeaders: Record<string, string> = {};

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookies, headers) {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToWrite.push(...cookies);
          cacheHeaders = headers;
        },
      },
    },
  );

  // Verifies the token and refreshes it when expired. Do not remove: without
  // this call, sessions silently expire for server-rendered pages.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  const { prefix, path } = splitLocalePrefix(request.nextUrl.pathname);
  const response =
    !signedIn && isProtected(path)
      ? NextResponse.redirect(
          new URL(
            `${prefix}/login?next=${encodeURIComponent(path + request.nextUrl.search)}`,
            request.url,
          ),
        )
      : handleI18nRouting(request);

  cookiesToWrite.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options),
  );
  // Responses that set auth cookies must never be cached by a CDN, or one
  // user's session could be served to another.
  Object.entries(cacheHeaders).forEach(([key, value]) =>
    response.headers.set(key, value),
  );

  return response;
}

export const config = {
  // Every page, but not API routes, Next.js internals or files with an extension.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
