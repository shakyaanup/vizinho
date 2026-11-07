import { hasLocale } from "next-intl";
import { routing, type Locale } from "./routing";

// Form actions don't know the [locale] route segment, so a form posts it in a
// hidden field. Anything unexpected falls back to the default locale.
export function readLocale(formData: FormData): Locale {
  const value = formData.get("locale");
  return hasLocale(routing.locales, value) ? value : routing.defaultLocale;
}
