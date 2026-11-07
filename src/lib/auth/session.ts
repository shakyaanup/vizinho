import { useEffect, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
import { setSessionUserId, useDemoState } from "@/mocks/store";
import type { User } from "@/mocks/types";

export type Session =
  { status: "loading" } | { status: "signedOut" } | { status: "signedIn"; user: User };

/**
 * Who is signed in, for client components. "loading" during server rendering
 * and hydration, because the session lives in this browser's storage.
 *
 * This is a demo session, not security: anyone can edit localStorage. In the
 * original backend design the database enforced every rule (docs/adr/0001).
 */
export function useSession(): Session {
  const state = useDemoState();
  if (!state) return { status: "loading" };
  const user = state.userId
    ? state.db.users.find((u) => u.id === state.userId)
    : undefined;
  return user ? { status: "signedIn", user } : { status: "signedOut" };
}

export const signIn = (userId: string) => setSessionUserId(userId);
export const signOut = () => setSessionUserId(null);

/** The signed-in user. Only for components rendered inside RoleGate. */
export function useCurrentUser(): User {
  const session = useSession();
  if (session.status !== "signedIn") {
    throw new Error("useCurrentUser() must be used inside <RoleGate>");
  }
  return session.user;
}

/**
 * Sends signed-out visitors away. Arriving signed out → login, then back to
 * `next`. Signing out while here (this tab or another) → home, so logging out
 * never bounces through the login page.
 */
export function useSignedOutRedirect(session: Session, next: string) {
  const router = useRouter();
  const wasSignedIn = useRef(false);

  useEffect(() => {
    if (session.status === "signedIn") wasSignedIn.current = true;
    if (session.status !== "signedOut") return;
    if (wasSignedIn.current) router.replace("/");
    else router.replace({ pathname: "/login", query: { next } });
  }, [session, router, next]);
}
