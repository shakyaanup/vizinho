import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

/**
 * Runs before every page request. Only language routing: adds or strips the
 * /pt prefix and remembers the visitor's language. There is no server session
 * (the demo signs in in the browser), so access checks happen in RoleGate.
 */
export const proxy = createIntlMiddleware(routing);

export const config = {
  // Every page, but not API routes, Next.js internals or files with an extension.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
