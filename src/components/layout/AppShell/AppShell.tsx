import { getTranslations } from "next-intl/server";
import { Suspense, type ReactNode } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { Link } from "@/i18n/navigation";
import type { AppRole } from "@/lib/auth/roles";
import { AppNav } from "./AppNav";
import { RoleGate } from "./RoleGate";
import { UserMenu } from "./UserMenu";
import styles from "./AppShell.module.scss";

type AppShellProps = { area: AppRole; children: ReactNode };

/**
 * Layout for the signed-in areas.
 *
 * Phones: top bar + bottom tab bar (thumb-reachable). Desktop: sidebar.
 * Everything here except the user menu and the page itself is static, so it
 * prerenders and paints instantly; the session-dependent parts stream in
 * behind their own <Suspense> boundaries.
 */
export async function AppShell({ area, children }: AppShellProps) {
  const t = await getTranslations("Nav");
  const tShell = await getTranslations("Shell");

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href={`/${area}`} className={styles.logo}>
          Vizinho
        </Link>
        <span className={styles.areaBadge}>{t(`areas.${area}`)}</span>
        <nav aria-label={t("mainNavigation")}>
          <AppNav area={area} variant="sidebar" />
        </nav>
      </aside>

      <div className={styles.column}>
        <header className={styles.topbar}>
          <Link href={`/${area}`} className={styles.topbarLogo}>
            Vizinho
          </Link>
          <span className={styles.topbarArea}>{t(`areas.${area}`)}</span>
          <Suspense
            fallback={
              <span className={styles.userSkeleton} aria-label={tShell("loadingUser")} />
            }
          >
            <UserMenu area={area} />
          </Suspense>
        </header>

        <main id="main" className={styles.main}>
          <Suspense
            fallback={
              <div className={styles.pageLoading}>
                <Spinner size="lg" label={tShell("loadingPage")} />
              </div>
            }
          >
            <RoleGate role={area}>{children}</RoleGate>
          </Suspense>
        </main>
      </div>

      <nav aria-label={t("mainNavigation")} className={styles.bottomNav}>
        <AppNav area={area} variant="tabs" />
      </nav>
    </div>
  );
}
