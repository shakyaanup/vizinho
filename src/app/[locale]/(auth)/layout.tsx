import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { Logo } from "@/components/ui/Logo";
import { Link } from "@/i18n/navigation";
import styles from "./auth-layout.module.scss";

/** Shared shell for login, sign-up and password pages: logo, language, card. */
export default function AuthLayout({ children }: LayoutProps<"/[locale]">) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          <Logo />
        </Link>
        <LocaleSwitcher />
      </header>
      <main id="main" className={styles.main}>
        <div className={styles.card}>{children}</div>
      </main>
    </div>
  );
}
