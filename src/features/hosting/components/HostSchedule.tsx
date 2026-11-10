"use client";

import { Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCurrentUser } from "@/lib/auth/session";
import { useDemoState } from "@/mocks/store";
import { upcomingTimeOff } from "../selectors";
import { hoursByDay } from "../service";
import { HoursForm } from "./HoursForm";
import { PauseRequests } from "./PauseRequests";
import { SuspendedNotice } from "./SuspendedNotice";
import { TimeOff } from "./TimeOff";
import styles from "./host-settings.module.scss";

/** /host/schedule: pause new requests, weekly hours and time off. */
export function HostSchedule() {
  const t = useTranslations("HostSettings");
  const tHosting = useTranslations("Hosting");
  const user = useCurrentUser();
  const state = useDemoState();

  const data = useMemo(() => {
    if (!state) return null;
    const listing = state.db.hosts.find((host) => host.userId === user.id) ?? null;
    return listing
      ? {
          listing,
          hours: hoursByDay(state.db, listing.id),
          timeOff: upcomingTimeOff(state.db, listing.id),
        }
      : { listing: null };
  }, [state, user.id]);

  const header = (
    <PageHeader title={t("scheduleTitle")} subtitle={t("scheduleSubtitle")} />
  );
  if (!data) return header;
  if (!data.listing) {
    return (
      <>
        {header}
        <EmptyState icon={Store} title={t("noListing")} />
      </>
    );
  }

  const { listing } = data;
  // Pause and time off only make sense for a live listing.
  const editable = listing.status === "approved";

  return (
    <>
      {header}
      <div className={styles.stack}>
        {listing.status === "suspended" && <SuspendedNotice note={listing.reviewNote} />}

        <Card as="section" aria-labelledby="pause-title">
          <PauseRequests paused={listing.isPaused} editable={editable} />
        </Card>

        <Card as="section" aria-labelledby="hours-title">
          <h2 id="hours-title" className={styles.title}>
            {t("hours.title")}
          </h2>
          <p className={styles.intro}>{tHosting("hours.intro")}</p>
          <HoursForm hoursByDay={data.hours} hasListing editable={editable} />
        </Card>

        <Card as="section" aria-labelledby="time-off-title">
          <h2 id="time-off-title" className={styles.title}>
            {t("timeOff.title")}
          </h2>
          <p className={styles.intro}>{t("timeOff.intro")}</p>
          <TimeOff periods={data.timeOff} editable={editable} />
        </Card>
      </div>
    </>
  );
}
