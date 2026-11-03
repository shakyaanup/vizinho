import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { routing } from "./routing";

export default getRequestConfig(async ({ locale }) => {
  // An explicit locale (e.g. getTranslations({ locale })) wins; otherwise read
  // the [locale] root segment. Root params are known at build time, so pages
  // stay prerenderable under Cache Components.
  const requested = locale ?? (await rootLocale());
  const resolved = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale: resolved,
    messages: (await import(`../messages/${resolved}.json`)).default,
    timeZone: "Europe/Lisbon",
  };
});
