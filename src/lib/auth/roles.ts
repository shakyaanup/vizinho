import type { Database } from "@/types/database";

export type AppRole = Database["public"]["Enums"]["app_role"];

export const APP_ROLES = [
  "customer",
  "host",
  "admin",
] as const satisfies readonly AppRole[];

/**
 * Reads the `app_roles` JWT claim added by the custom access token hook.
 * The claim is untyped JSON, so anything that isn't a known role is dropped.
 */
export function parseRoles(claim: unknown): AppRole[] {
  if (!Array.isArray(claim)) return [];
  return claim.filter((role): role is AppRole =>
    (APP_ROLES as readonly unknown[]).includes(role),
  );
}

/** Where to send a user after signing in: their most privileged area. */
export function homePathForRoles(roles: readonly AppRole[]): string {
  if (roles.includes("admin")) return "/admin";
  if (roles.includes("host")) return "/host";
  return "/customer";
}
