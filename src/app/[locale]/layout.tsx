import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Geist } from "next/font/google";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { routing } from "@/i18n/routing";
import { Providers } from "./providers";
import "../globals.scss";
import styles from "./layout.module.scss";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin", "latin-ext"] });

// One prerendered shell per language (required by Cache Components).
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return {
    title: { default: "Vizinho", template: "%s · Vizinho" },
    description: t("description"),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a09" },
  ],
};

export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await rootLocale();
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations("Common");

  return (
    <html lang={locale} className={geistSans.variable}>
      <body>
        <a href="#main" className={styles.skipLink}>
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
