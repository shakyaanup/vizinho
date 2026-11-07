import type { AppRole } from "@/mocks/types";

export type { AppRole };

export const APP_ROLES = [
  "customer",
  "host",
  "admin",
] as const satisfies readonly AppRole[];

export const isAppRole = (value: unknown): value is AppRole =>
  (APP_ROLES as readonly unknown[]).includes(value);

/** Where to send a user after signing in: their most privileged area. */
export function homePathForRoles(roles: readonly AppRole[]): string {
  if (roles.includes("admin")) return "/admin";
  if (roles.includes("host")) return "/host";
  return "/customer";
}
