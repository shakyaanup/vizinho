"use client";

import { MapPin, Package, PackageSearch, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { Link } from "@/i18n/navigation";
import { useCurrentUser } from "@/lib/auth/session";
import { useDemoState } from "@/mocks/store";
import { customerDashboard } from "../selectors";
import styles from "./dashboard.module.scss";

export function CustomerHome() {
  const user = useCurrentUser();
  const t = useTranslations("Dashboard");
  const state = useDemoState();
  const data = useMemo(
    () => state && customerDashboard(state.db, user.id),
    [state, user.id],
  );

  return (
    <>
      <PageHeader
        title={t("greeting", { name: user.fullName.split(" ")[0] ?? "" })}
        subtitle={t("customer.subtitle")}
      />
      <div className={styles.stack}>
        <div className={styles.stats}>
          <StatCard
            icon={Package}
            label={t("customer.activeTitle")}
            value={data?.activeReservations ?? "—"}
          />
        </div>

        {data?.activeReservations === 0 && (
          <EmptyState
            icon={PackageSearch}
            title={t("customer.emptyTitle")}
            action={
              <Button asChild>
                <Link href="/customer/hosts">
                  <MapPin aria-hidden /> {t("customer.findHost")}
                </Link>
              </Button>
            }
          >
            <p>{t("customer.emptyBody")}</p>
          </EmptyState>
        )}

        <Card as="section" aria-labelledby="how-title">
          <h2 id="how-title" className={styles.cardTitle}>
            {t("customer.howTitle")}
          </h2>
          <p className={styles.muted}>{t("customer.howBody")}</p>
        </Card>

        {!user.roles.includes("host") && (
          <Card as="section" aria-labelledby="host-cta-title">
            <h2 id="host-cta-title" className={styles.cardTitle}>
              {t("customer.hostCtaTitle")}
            </h2>
            <p className={styles.muted}>{t("customer.hostCtaBody")}</p>
            <Button asChild variant="secondary" className={styles.cardAction}>
              <Link href="/customer/become-a-host">
                <Store aria-hidden /> {t("customer.hostCtaButton")}
              </Link>
            </Button>
          </Card>
        )}
      </div>
    </>
  );
}
