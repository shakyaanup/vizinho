import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { SignOutButton } from "@/features/auth/components/SignOutButton";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import styles from "./account.module.scss";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Account");
  return { title: t("title") };
}

const notices = { confirmed: "confirmed", passwordUpdated: "passwordUpdated" } as const;

/** Everything that depends on the session renders here, behind Suspense. */
async function AccountDetails({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const user = await requireUser("/account");
  const t = await getTranslations("Account");
  const { notice } = await searchParams;

  // RLS returns only the signed-in user's own row.
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const noticeKey =
    notice && notice in notices ? notices[notice as keyof typeof notices] : null;

  return (
    <>
      {noticeKey && <Alert variant="success" title={t(noticeKey)} />}
      <h1>{t("welcome", { name: profile?.full_name ?? user.email ?? "" })}</h1>
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
    </>
  );
}

export default function AccountPage({ searchParams }: PageProps<"/[locale]/account">) {
  return (
    <>
      <header className={styles.header}>
        <span className={styles.logo}>Vizinho</span>
        <LocaleSwitcher />
      </header>
      <main id="main" className={styles.main}>
        <Suspense fallback={<Spinner size="lg" />}>
          <AccountDetails searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}
