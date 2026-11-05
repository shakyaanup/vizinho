import { MapPin, PackageCheck, QrCode } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/ui/Logo";
import { DemoLogin } from "@/features/auth/components/DemoLogin";
import { Link } from "@/i18n/navigation";
import styles from "./page.module.scss";

export default async function HomePage() {
  const t = await getTranslations("Home");
  const steps = [
    { key: "find", Icon: MapPin },
    { key: "reserve", Icon: PackageCheck },
    { key: "collect", Icon: QrCode },
  ] as const;

  return (
    <>
      <header className={styles.header}>
        <Logo className={styles.logo} />
        <nav className={styles.nav}>
          <LocaleSwitcher />
          <Button asChild variant="ghost">
            <Link href="/login">{t("logIn")}</Link>
          </Button>
        </nav>
      </header>

      <main id="main" className={styles.main}>
        <section className={styles.hero} aria-labelledby="hero-title">
          <p className={styles.eyebrow}>{t("eyebrow")}</p>
          <h1 id="hero-title" className={styles.title}>
            {t("title")}
          </h1>
          <p className={styles.lead}>{t("lead")}</p>
          <div className={styles.actions}>
            <Button asChild size="lg">
              <Link href="/signup">{t("createAccount")}</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/login">{t("logIn")}</Link>
            </Button>
          </div>
        </section>

        <section aria-labelledby="steps-title" className={styles.section}>
          <h2 id="steps-title">{t("steps.title")}</h2>
          <ol className={styles.steps}>
            {steps.map(({ key, Icon }, index) => (
              <li key={key} className={styles.step}>
                <span className={styles.stepIcon} aria-hidden>
                  <Icon />
                </span>
                <span className={styles.stepNumber}>{index + 1}</span>
                <span>{t(`steps.${key}`)}</span>
              </li>
            ))}
          </ol>
        </section>

        <Card as="section" elevated aria-labelledby="demo-title" className={styles.demo}>
          <h2 id="demo-title">{t("demo.title")}</h2>
          <p className={styles.muted}>{t("demo.body")}</p>
          <DemoLogin />
        </Card>

        <p className={styles.disclaimer}>{t("disclaimer")}</p>
      </main>
    </>
  );
}
