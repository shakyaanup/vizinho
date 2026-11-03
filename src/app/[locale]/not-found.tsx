import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import styles from "./not-found.module.scss";

export default async function NotFound() {
  const t = await getTranslations("NotFound");
  return (
    <main id="main" className={styles.main}>
      <p className={styles.code}>404</p>
      <h1>{t("title")}</h1>
      <p className={styles.body}>{t("body")}</p>
      <Button asChild>
        <Link href="/">{t("home")}</Link>
      </Button>
    </main>
  );
}
