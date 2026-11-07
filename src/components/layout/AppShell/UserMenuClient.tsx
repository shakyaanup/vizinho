"use client";

import {
  Check,
  ChevronDown,
  Languages,
  LogOut,
  Monitor,
  Moon,
  Sun,
  UserRound,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/Avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { APP_ROLES, type AppRole } from "@/lib/auth/roles";
import { signOut, useSession } from "@/lib/auth/session";
import { isTheme } from "@/lib/theme/theme";
import { useTheme } from "@/lib/theme/use-theme";
import styles from "./AppShell.module.scss";

const LANGUAGE_NAMES: Record<Locale, string> = { en: "English", "pt-PT": "Português" };

type UserMenuProps = { area: AppRole; loadingLabel: string };

/** The signed-in user's menu. A placeholder until the session is read. */
export function UserMenu({ area, loadingLabel }: UserMenuProps) {
  const session = useSession();
  if (session.status !== "signedIn") {
    return <span className={styles.userSkeleton} aria-label={loadingLabel} />;
  }
  const { fullName, email, roles } = session.user;
  return <UserMenuClient area={area} name={fullName} email={email} roles={roles} />;
}

type UserMenuClientProps = {
  area: AppRole;
  name: string;
  email: string | null;
  roles: AppRole[];
};

export function UserMenuClient({ area, name, email, roles }: UserMenuClientProps) {
  const t = useTranslations("Shell");
  const tNav = useTranslations("Nav");
  const tAuth = useTranslations("Auth");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [theme, setTheme] = useTheme();

  // Only areas the user can actually enter (from the verified JWT claim).
  const areas = APP_ROLES.filter((role) => roles.includes(role));

  function handleSignOut() {
    router.replace("/");
    signOut();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={styles.userTrigger} aria-label={t("userMenu")}>
        <Avatar name={name} size="sm" />
        <span className={styles.userName}>{name}</span>
        <ChevronDown aria-hidden className={styles.userChevron} />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <div className={styles.userSummary}>
          <Avatar name={name} />
          <div className={styles.userSummaryText}>
            <span className={styles.userSummaryName}>{name}</span>
            {email && <span className={styles.userSummaryEmail}>{email}</span>}
          </div>
        </div>

        {areas.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t("switchArea")}</DropdownMenuLabel>
            {/* Navigation, not a setting, so these are links (menuitem), with
                the current area marked by a check and aria-current. */}
            {areas.map((role) => (
              <DropdownMenuItem key={role} asChild>
                <Link href={`/${role}`} aria-current={role === area ? "page" : undefined}>
                  {role === area ? (
                    <Check aria-hidden />
                  ) : (
                    <span className={styles.menuIconSpacer} />
                  )}
                  {tNav(`areas.${role}`)}
                </Link>
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account">
            <UserRound aria-hidden /> {t("account")}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t("theme")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => isTheme(value) && setTheme(value)}
        >
          <DropdownMenuRadioItem value="system">
            <Monitor aria-hidden /> {t("themeSystem")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light">
            <Sun aria-hidden /> {t("themeLight")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon aria-hidden /> {t("themeDark")}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>
          <Languages aria-hidden className={styles.labelIcon} /> {t("language")}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(next) => router.replace(pathname, { locale: next as Locale })}
        >
          {routing.locales.map((code) => (
            <DropdownMenuRadioItem key={code} value={code} lang={code}>
              {LANGUAGE_NAMES[code]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleSignOut}>
          <LogOut aria-hidden /> {tAuth("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
