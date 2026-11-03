"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import styles from "./LocaleSwitcher.module.scss";

// Each option is labelled in its own language, as users look for their own.
const otherLocale: Record<Locale, { locale: Locale; label: string; short: string }> = {
  en: { locale: "pt-PT", label: "Português", short: "PT" },
  "pt-PT": { locale: "en", label: "English", short: "EN" },
};

/** Links to the same page in the other language. */
export function LocaleSwitcher() {
  const t = useTranslations("Common");
  const pathname = usePathname();
  const target = otherLocale[useLocale()];

  return (
    <Link
      href={pathname}
      locale={target.locale}
      className={styles.switcher}
      hrefLang={target.locale}
      aria-label={`${t("language")}: ${target.label}`}
    >
      <Languages aria-hidden />
      <span>{target.short}</span>
    </Link>
  );
}
