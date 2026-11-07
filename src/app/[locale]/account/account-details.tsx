"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { SignOutButton } from "@/features/auth/components/SignOutButton";
import { ResetDemoData } from "@/features/demo/ResetDemoData";
import { Link } from "@/i18n/navigation";
import { useSession, useSignedOutRedirect } from "@/lib/auth/session";
import styles from "./account.module.scss";

export function AccountDetails() {
  const t = useTranslations("Account");
  const tDemo = useTranslations("Demo");
  const session = useSession();
  useSignedOutRedirect(session, "/account");

  if (session.status !== "signedIn") return <Spinner size="lg" />;
  const { user } = session;

  return (
    <>
      <h1>{t("welcome", { name: user.fullName })}</h1>
      <Card as="section">
        <dl className={styles.details}>
          <dt>{t("email")}</dt>
          <dd>{user.email}</dd>
          <dt>{t("roles")}</dt>
          <dd>
            <ul className={styles.roles}>
              {user.roles.map((role) => (
                <li key={role} className={styles.role}>
                  {t(`roleNames.${role}`)}
                </li>
              ))}
            </ul>
          </dd>
        </dl>
      </Card>
      <div className={styles.actions}>
        <Button asChild>
          <Link href="/dashboard">{t("goToDashboard")}</Link>
        </Button>
        <SignOutButton />
      </div>
      <Card as="section" aria-labelledby="demo-title">
        <h2 id="demo-title" className={styles.demoTitle}>
          {tDemo("reset")}
        </h2>
        <p className={styles.muted}>{tDemo("resetHint")}</p>
        <ResetDemoData />
      </Card>
    </>
  );
}
