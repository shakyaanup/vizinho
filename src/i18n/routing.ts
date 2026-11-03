import { defineRouting } from "next-intl/routing";

/**
 * URL prefix per non-default locale. English lives at "/", Portuguese at
 * "/pt" (shorter than "/pt-PT"), while the locale itself stays the precise
 * BCP 47 tag used for dates and numbers.
 */
export const LOCALE_URL_PREFIXES = { "pt-PT": "/pt" } as const;

export const routing = defineRouting({
  locales: ["en", "pt-PT"],
  defaultLocale: "en",
  localePrefix: { mode: "as-needed", prefixes: LOCALE_URL_PREFIXES },
});

export type Locale = (typeof routing.locales)[number];
