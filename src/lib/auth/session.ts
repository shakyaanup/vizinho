import "server-only";
import { getLocale } from "next-intl/server";
import { connection } from "next/server";
import { cache } from "react";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { homePathForRoles, parseRoles, type AppRole } from "./roles";

export type SessionUser = {
  id: string;
  email: string | null;
  roles: AppRole[];
};

/**
 * Data Access Layer entry point: who is making this request?
 *
 * Uses getClaims(), which verifies the JWT signature, never getSession(),
 * whose cookie data is not verified and must not be trusted on the server.
 * Wrapped in React `cache` so many components can call it per request while
 * the token is checked only once.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  // A session check depends on this request and on the current time (token
  // expiry), so it must never run during prerendering or prefetching.
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;

  const { claims } = data;
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    roles: parseRoles(claims.app_roles),
  };
});

/** Returns the user or redirects to login, coming back to `returnTo` afterwards. */
export async function requireUser(returnTo: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect({
      href: { pathname: "/login", query: { next: returnTo } },
      locale: await getLocale(),
    });
  }
  return user!;
}

/**
 * Route guard for role areas. Signed-out users go to login; signed-in users
 * without the role go to their own home instead of an error page.
 * This is a UX gate: the data itself is protected by RLS regardless.
 */
export async function requireRole(role: AppRole, returnTo: string): Promise<SessionUser> {
  const user = await requireUser(returnTo);
  if (!user.roles.includes(role)) {
    redirect({ href: homePathForRoles(user.roles), locale: await getLocale() });
  }
  return user;
}
