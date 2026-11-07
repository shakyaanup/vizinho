"use client";

import { CircleAlert, Clock, Package, Store, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { Link } from "@/i18n/navigation";
import { useDemoState } from "@/mocks/store";
import { adminDashboard } from "../selectors";
import styles from "./dashboard.module.scss";

export function AdminHome() {
  const t = useTranslations("Dashboard.admin");
  const tNav = useTranslations("Nav.admin");
  const state = useDemoState();
  const data = useMemo(() => state && adminDashboard(state.db), [state]);
  const show = (value: number | undefined) => value ?? "—";

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
        <StatCard icon={Users} label={t("users")} value={show(data?.users)} />
        <StatCard
          icon={Store}
          label={t("hostsApproved")}
          value={show(data?.hostsApproved)}
        />
        <StatCard
          icon={Clock}
          label={t("hostsPending")}
          value={show(data?.hostsPending)}
        />
        <StatCard
          icon={Package}
          label={t("reservationsActive")}
          value={show(data?.reservationsActive)}
        />
        <StatCard
          icon={CircleAlert}
          label={t("openIncidents")}
          value={show(data?.openIncidents)}
        />
      </div>
    </>
  );
}
