import type messages from "@/messages/en.json";
import type { routing } from "./routing";

// Makes translation keys type-checked: t("Auth.typo") is a compile error.
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
