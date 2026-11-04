import { CircleAlert, Clock, Package, Store, Users } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { getAdminDashboard } from "@/features/dashboard/queries";
import { Link } from "@/i18n/navigation";
import styles from "../dashboard.module.scss";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Nav.admin");
  return { title: t("overview") };
}

export default async function AdminHomePage() {
  const t = await getTranslations("Dashboard.admin");
  const tNav = await getTranslations("Nav.admin");
  const data = await getAdminDashboard();
  const show = (value: number | null) => value ?? "—";

  return (
    <>
      <PageHeader
        title={tNav("overview")}
        subtitle={t("subtitle")}
        actions={
          <Button asChild variant="secondary">
            <Link href="/admin/hosts">{t("reviewHosts")}</Link>
          </Button>
        }
      />
      <div className={styles.stats}>
        <StatCard icon={Users} label={t("users")} value={show(data.users)} />
        <StatCard
          icon={Store}
          label={t("hostsApproved")}
          value={show(data.hostsApproved)}
        />
        <StatCard
          icon={Clock}
          label={t("hostsPending")}
          value={show(data.hostsPending)}
        />
        <StatCard
          icon={Package}
          label={t("reservationsActive")}
          value={show(data.reservationsActive)}
        />
        <StatCard
          icon={CircleAlert}
          label={t("openIncidents")}
          value={show(data.openIncidents)}
        />
      </div>
    </>
  );
}
