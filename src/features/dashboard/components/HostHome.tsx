"use client";

import { Boxes, Inbox, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { useCurrentUser } from "@/lib/auth/session";
import { useDemoState } from "@/mocks/store";
import type { HostStatus } from "@/mocks/types";
import { hostDashboard } from "../selectors";
import styles from "./dashboard.module.scss";

const statusTone: Record<
  HostStatus,
  "neutral" | "primary" | "success" | "warning" | "danger"
> = {
  draft: "neutral",
  pending_review: "warning",
  approved: "success",
  rejected: "danger",
  suspended: "danger",
};

export function HostHome() {
  const user = useCurrentUser();
  const t = useTranslations("Dashboard");
  const state = useDemoState();
  const data = useMemo(() => state && hostDashboard(state.db, user.id), [state, user.id]);

  const header = (
    <PageHeader
      title={t("greeting", { name: user.fullName.split(" ")[0] ?? "" })}
      subtitle={t("host.subtitle")}
    />
  );

  if (!data?.listing) {
    return (
      <>
        {header}
        {data && <EmptyState icon={Store} title={t("host.noListing")} />}
      </>
    );
  }

  const { listing } = data;
  return (
    <>
      {header}
      <div className={styles.stack}>
        <div className={styles.stats}>
          <StatCard
            icon={Inbox}
            label={t("host.pendingTitle")}
            value={data.pendingRequests}
          />
          <StatCard
            icon={Boxes}
            label={t("host.storedTitle")}
            value={data.parcelsStored}
          />
        </div>

        <Card as="section" aria-labelledby="listing-title">
          <div className={styles.cardHeader}>
            <h2 id="listing-title" className={styles.cardTitle}>
              {listing.displayName}
            </h2>
            <div className={styles.badges}>
              <Badge tone={statusTone[listing.status]}>
                {t(`host.status.${listing.status}`)}
              </Badge>
              {listing.isPaused && <Badge tone="warning">{t("host.paused")}</Badge>}
            </div>
          </div>
          <dl className={styles.details}>
            <dt>{t("host.area")}</dt>
            <dd>{listing.areaLabel ?? "—"}</dd>
            <dt>{t("host.capacity")}</dt>
            <dd>{t("host.capacityValue", { count: listing.maxConcurrentParcels })}</dd>
            <dt>{t("host.openingSlots")}</dt>
            <dd>{t("host.openingSlotsValue", { count: data.openingSlots })}</dd>
          </dl>
        </Card>
      </div>
    </>
  );
}
