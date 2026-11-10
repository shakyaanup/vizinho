"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Link } from "@/i18n/navigation";
import { useCurrentUser } from "@/lib/auth/session";
import { useDemoState } from "@/mocks/store";
import { applicationChecklist, hoursByDay, isEditable } from "../service";
import { HoursForm } from "./HoursForm";
import { listingDefaults, locationDefaults } from "./form-defaults";
import { ListingForm } from "./ListingForm";
import { LocationForm } from "./LocationForm";
import { SubmitForm } from "./SubmitForm";
import styles from "./become-a-host.module.scss";

export function BecomeAHost() {
  const t = useTranslations("Hosting");
  const user = useCurrentUser();
  const state = useDemoState();

  const application = useMemo(() => {
    if (!state) return null;
    const listing = state.db.hosts.find((host) => host.userId === user.id) ?? null;
    return listing
      ? {
          listing,
          hours: hoursByDay(state.db, listing.id),
          address:
            state.db.hostPrivateDetails.find((d) => d.hostId === listing.id) ?? null,
          checklist: applicationChecklist(state.db, listing),
          editable: isEditable(listing),
        }
      : { listing: null, hours: {}, address: null, checklist: null, editable: true };
  }, [state, user.id]);

  const header = <PageHeader title={t("title")} subtitle={t("subtitle")} />;
  if (!application) return header;

  const { listing, editable } = application;
  const status = listing?.status ?? "draft";

  // Decided applications: no form, just where to go next.
  if (status === "approved" || status === "suspended") {
    return (
      <>
        {header}
        {status === "approved" ? (
          <Alert variant="success" title={t("status.approvedTitle")}>
            <p>{t("status.approvedBody")}</p>
            <Button asChild className={styles.statusAction}>
              <Link href="/host">{t("status.goToHostArea")}</Link>
            </Button>
          </Alert>
        ) : (
          <Alert variant="error" title={t("status.suspendedTitle")}>
            <p>{t("status.suspendedBody")}</p>
          </Alert>
        )}
      </>
    );
  }

  const defaults = listingDefaults(listing);
  const location = locationDefaults(listing, application.address);

  return (
    <>
      {header}
      <div className={styles.stack}>
        {status === "pending_review" && (
          <Alert title={t("status.pendingTitle")}>
            <p>{t("status.pendingBody")}</p>
          </Alert>
        )}
        {status === "rejected" && (
          <Alert variant="error" title={t("status.rejectedTitle")}>
            {listing?.reviewNote && (
              <p>{t("status.reviewNote", { note: listing.reviewNote })}</p>
            )}
            <p>{t("status.rejectedBody")}</p>
          </Alert>
        )}

        <Card as="section" aria-labelledby="step-listing">
          <StepHeading id="step-listing" number={1} title={t("steps.listing")} />
          <p className={styles.intro}>{t("listing.intro")}</p>
          <ListingForm defaults={defaults} editable={editable} />
        </Card>

        <Card as="section" aria-labelledby="step-hours">
          <StepHeading id="step-hours" number={2} title={t("steps.hours")} />
          <p className={styles.intro}>{t("hours.intro")}</p>
          <HoursForm
            hoursByDay={application.hours}
            hasListing={Boolean(listing)}
            editable={editable}
          />
        </Card>

        <Card as="section" aria-labelledby="step-location">
          <StepHeading id="step-location" number={3} title={t("steps.location")} />
          <p className={styles.intro}>{t("location.intro")}</p>
          {listing ? (
            <LocationForm defaults={location} editable={editable} />
          ) : (
            <p className={styles.intro}>{t("hours.needListing")}</p>
          )}
        </Card>

        <Card as="section" aria-labelledby="step-submit">
          <StepHeading id="step-submit" number={4} title={t("steps.submit")} />
          <p className={styles.intro}>{t("submit.intro")}</p>
          <SubmitForm
            checklist={
              application.checklist ?? { listing: false, hours: false, location: false }
            }
            canSubmit={Boolean(listing) && editable}
          />
        </Card>
      </div>
    </>
  );
}

function StepHeading({
  id,
  number,
  title,
}: {
  id: string;
  number: number;
  title: string;
}) {
  return (
    <h2 id={id} className={styles.stepTitle}>
      <span className={styles.stepNumber} aria-hidden>
        {number}
      </span>
      {title}
    </h2>
  );
}
