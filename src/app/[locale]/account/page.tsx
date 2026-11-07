import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { Logo } from "@/components/ui/Logo";
import { AccountDetails } from "./account-details";
import styles from "./account.module.scss";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Account");
  return { title: t("title") };
}

export default function AccountPage() {
  return (
    <>
      <header className={styles.header}>
        <Logo className={styles.logo} />
        <LocaleSwitcher />
      </header>
      <main id="main" className={styles.main}>
        <AccountDetails />
      </main>
    </>
  );
}
