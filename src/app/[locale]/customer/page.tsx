import { MapPin, Package, PackageSearch } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { getCustomerDashboard } from "@/features/dashboard/queries";
import { Link } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth/profile";
import styles from "../dashboard.module.scss";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Nav.customer");
  return { title: t("home") };
}

export default async function CustomerHomePage() {
  const t = await getTranslations("Dashboard");
  const [profile, data] = await Promise.all([
    getCurrentProfile(),
    getCustomerDashboard(),
  ]);

  return (
    <>
      <PageHeader
        title={t("greeting", { name: profile?.fullName.split(" ")[0] ?? "" })}
        subtitle={t("customer.subtitle")}
      />
      <div className={styles.stack}>
        <div className={styles.stats}>
          <StatCard
            icon={Package}
            label={t("customer.activeTitle")}
            value={data.activeReservations ?? "—"}
          />
        </div>

        {data.activeReservations === 0 && (
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
      </div>
    </>
  );
}
