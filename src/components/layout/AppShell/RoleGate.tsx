"use client";

import { useTranslations } from "next-intl";
import { useEffect, type ReactNode } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { usePathname, useRouter } from "@/i18n/navigation";
import { homePathForRoles, type AppRole } from "@/lib/auth/roles";
import { useSession, useSignedOutRedirect } from "@/lib/auth/session";
import styles from "./AppShell.module.scss";

/**
 * Renders the area only for users with `role`. Signed-out visitors go to
 * login (and come back afterwards); users without the role go to their own
 * area. The session lives in the browser, so this runs after hydration and
 * shows a spinner until then.
 */
export function RoleGate({ role, children }: { role: AppRole; children: ReactNode }) {
  const t = useTranslations("Shell");
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const allowed = session.status === "signedIn" && session.user.roles.includes(role);
  useSignedOutRedirect(session, pathname);

  useEffect(() => {
    if (session.status === "signedIn" && !allowed) {
      router.replace(homePathForRoles(session.user.roles));
    }
  }, [session, allowed, router]);

  if (!allowed) {
    return (
      <div className={styles.pageLoading}>
        <Spinner size="lg" label={t("loadingPage")} />
      </div>
    );
  }
  return children;
}
