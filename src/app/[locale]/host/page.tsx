import { Boxes, Inbox, Store } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { getHostDashboard } from "@/features/dashboard/queries";
import { getCurrentProfile } from "@/lib/auth/profile";
import type { Database } from "@/types/database";
import styles from "../dashboard.module.scss";

type HostStatus = Database["public"]["Enums"]["host_status"];

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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Nav.host");
  return { title: t("dashboard") };
}

export default async function HostHomePage() {
  const t = await getTranslations("Dashboard");
  const [profile, data] = await Promise.all([getCurrentProfile(), getHostDashboard()]);
  const header = (
    <PageHeader
      title={t("greeting", { name: profile?.fullName.split(" ")[0] ?? "" })}
      subtitle={t("host.subtitle")}
    />
  );

  if (!data.listing) {
    return (
      <>
        {header}
        <EmptyState icon={Store} title={t("host.noListing")} />
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
            value={data.pendingRequests ?? "—"}
          />
          <StatCard
            icon={Boxes}
            label={t("host.storedTitle")}
            value={data.parcelsStored ?? "—"}
          />
        </div>

        <Card as="section" aria-labelledby="listing-title">
          <div className={styles.cardHeader}>
            <h2 id="listing-title" className={styles.cardTitle}>
              {listing.display_name}
            </h2>
            <div className={styles.badges}>
              <Badge tone={statusTone[listing.status]}>
                {t(`host.status.${listing.status}`)}
              </Badge>
              {listing.is_paused && <Badge tone="warning">{t("host.paused")}</Badge>}
            </div>
          </div>
          <dl className={styles.details}>
            <dt>{t("host.area")}</dt>
            <dd>{listing.area_label ?? "—"}</dd>
            <dt>{t("host.capacity")}</dt>
            <dd>{t("host.capacityValue", { count: listing.max_concurrent_parcels })}</dd>
            <dt>{t("host.openingSlots")}</dt>
            <dd>{t("host.openingSlotsValue", { count: data.openingSlots ?? 0 })}</dd>
          </dl>
        </Card>
      </div>
    </>
  );
}
