"use client";

import { Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCurrentUser } from "@/lib/auth/session";
import { useDemoState } from "@/mocks/store";
import { isEditable } from "../service";
import { listingDefaults, locationDefaults } from "./form-defaults";
import { ListingForm } from "./ListingForm";
import { LocationForm } from "./LocationForm";
import { SuspendedNotice } from "./SuspendedNotice";
import styles from "./host-settings.module.scss";

/** /host/listing: an approved host edits what customers see and where they are. */
export function HostListingSettings() {
  const t = useTranslations("HostSettings");
  const user = useCurrentUser();
  const state = useDemoState();

  const data = useMemo(() => {
    if (!state) return null;
    const listing = state.db.hosts.find((host) => host.userId === user.id) ?? null;
    const address = listing
      ? (state.db.hostPrivateDetails.find((d) => d.hostId === listing.id) ?? null)
      : null;
    return { listing, address };
  }, [state, user.id]);

  const header = <PageHeader title={t("listingTitle")} subtitle={t("listingSubtitle")} />;
  if (!data) return header;

  const { listing, address } = data;
  if (!listing) {
    return (
      <>
        {header}
        <EmptyState icon={Store} title={t("noListing")} />
      </>
    );
  }

  const editable = isEditable(listing);
  return (
    <>
      {header}
      <div className={styles.stack}>
        {listing.status === "suspended" && <SuspendedNotice note={listing.reviewNote} />}

        <Card as="section" aria-labelledby="listing-details">
          <h2 id="listing-details" className={styles.title}>
            {t("details")}
          </h2>
          <p className={styles.intro}>{t("detailsIntro")}</p>
          <ListingForm defaults={listingDefaults(listing)} editable={editable} />
        </Card>

        <Card as="section" aria-labelledby="listing-location">
          <h2 id="listing-location" className={styles.title}>
            {t("location")}
          </h2>
          <p className={styles.intro}>{t("locationIntro")}</p>
          <LocationForm
            defaults={locationDefaults(listing, address)}
            editable={editable}
          />
        </Card>
      </div>
    </>
  );
}
