import { getTranslations } from "next-intl/server";
import { Suspense, type ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";
import { Spinner } from "@/components/ui/Spinner";
import { Link } from "@/i18n/navigation";
import type { AppRole } from "@/lib/auth/roles";
import { AppNav, AppNavLinks } from "./AppNav";
import { RoleGate } from "./RoleGate";
import { UserMenu } from "./UserMenuClient";
import styles from "./AppShell.module.scss";

type AppShellProps = { area: AppRole; children: ReactNode };

/**
 * Layout for the signed-in areas.
 *
 * Phones: top bar + bottom tab bar (thumb-reachable). Desktop: sidebar.
 * The chrome is static and prerenders; the user menu and the page depend on
 * the browser-side session, so they fill in right after hydration.
 */
export async function AppShell({ area, children }: AppShellProps) {
  const t = await getTranslations("Nav");
  const tShell = await getTranslations("Shell");

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href={`/${area}`} className={styles.logo}>
          <Logo />
        </Link>
        <span className={styles.areaBadge}>{t(`areas.${area}`)}</span>
        <nav aria-label={t("mainNavigation")}>
          {/* Pages that read their URL per request only know it in the
              browser, so URL-reading parts sit in Suspense. */}
          <Suspense
            fallback={<AppNavLinks area={area} variant="sidebar" pathname={null} />}
          >
            <AppNav area={area} variant="sidebar" />
          </Suspense>
        </nav>
      </aside>

      <div className={styles.column}>
        <header className={styles.topbar}>
          <Link href={`/${area}`} className={styles.topbarLogo}>
            <Logo />
          </Link>
          <span className={styles.topbarArea}>{t(`areas.${area}`)}</span>
          <UserMenu area={area} loadingLabel={tShell("loadingUser")} />
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
        <Suspense fallback={<AppNavLinks area={area} variant="tabs" pathname={null} />}>
          <AppNav area={area} variant="tabs" />
        </Suspense>
      </nav>
    </div>
  );
}
