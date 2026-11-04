"use client";

import { clsx } from "clsx";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { AppRole } from "@/lib/auth/roles";
import { isNavItemActive, NAV_ITEMS } from "./nav-config";
import styles from "./AppShell.module.scss";

type AppNavProps = {
  area: AppRole;
  /** "sidebar" on desktop, "tabs" as the phone bottom bar. */
  variant: "sidebar" | "tabs";
};

export function AppNav({ area, variant }: AppNavProps) {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  return (
    <ul
      className={clsx(
        styles.navList,
        variant === "tabs" ? styles.tabs : styles.sidebarList,
      )}
    >
      {NAV_ITEMS[area].map((item) => {
        const active = isNavItemActive(pathname, item);
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={clsx(styles.navLink, active && styles.navLinkActive)}
              aria-current={active ? "page" : undefined}
            >
              <Icon aria-hidden className={styles.navIcon} />
              <span className={styles.navLabel}>
                {t(`${area}.${String(item.labelKey)}` as Parameters<typeof t>[0])}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
