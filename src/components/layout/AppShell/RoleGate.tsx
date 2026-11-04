import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/session";
import type { AppRole } from "@/lib/auth/roles";

/**
 * Renders the area only for users with `role`. Signed-out users go to login;
 * users without the role go to their own area.
 *
 * Defense in depth: the proxy already redirected most wrong visitors (fast
 * path), this is the authoritative check, and RLS still guards every row.
 */
export async function RoleGate({
  role,
  children,
}: {
  role: AppRole;
  children: ReactNode;
}) {
  await requireRole(role, `/${role}`);
  return children;
}
