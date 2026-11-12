"use client";

import { ArrowLeft, Eye, LockKeyhole } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LocationMap } from "@/components/map/LocationMap";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Textarea";
import { Link } from "@/i18n/navigation";
import { useCurrentUser } from "@/lib/auth/session";
import { useDemoState } from "@/mocks/store";
import type { HostPrivateDetails, HostReviewDecision, HostStatus } from "@/mocks/types";
import { revealPrivateDetails, reviewHost, type ReviewState } from "../../actions";
import { gridCell } from "../../location";
import { hostReview, STATUS_TONE } from "../../selectors";
import styles from "./admin.module.scss";

/** The decisions an admin can take from each state (mirrors the service). */
const DECISIONS: Partial<Record<HostStatus, HostReviewDecision[]>> = {
  pending_review: ["approve", "reject"],
  approved: ["suspend"],
  suspended: ["reinstate"],
};

const idle: ReviewState = { status: "idle" };

/** Audit actions with a translated label (others show their raw name). */
const HISTORY_ACTIONS = [
  "application_submitted",
  "approved",
  "rejected",
  "suspended",
  "reinstated",
  "private_details_viewed",
] as const;
const isHistoryAction = (key: string): key is (typeof HISTORY_ACTIONS)[number] =>
  (HISTORY_ACTIONS as readonly string[]).includes(key);

/** Reads ?host=<id> (render inside Suspense). */
export function HostReviewFromQuery() {
  const hostId = useSearchParams().get("host") ?? "";
  return <HostReview key={hostId} hostId={hostId} />;
}

export function HostReview({ hostId }: { hostId: string }) {
  const t = useTranslations("AdminHosts");
  const tStatus = useTranslations("Dashboard.host.status");
  const tListing = useTranslations("Hosting.listing");
  const tErrors = useTranslations("Hosting.errors");
  const tDays = useTranslations("Hosting.weekdays");
  const format = useFormatter();
  const admin = useCurrentUser();
  const state = useDemoState();

  const review = useMemo(() => state && hostReview(state.db, hostId), [state, hostId]);
  const [result, formAction, pending] = useActionState(reviewHost, idle);
  const [privateDetails, setPrivateDetails] = useState<HostPrivateDetails | null>(null);
  const [revealError, setRevealError] = useState<string | null>(null);
  const addressRef = useRef<HTMLElement>(null);

  // The reveal button disappears when pressed, so move focus to what it
  // revealed; otherwise keyboard and screen-reader users land at the top.
  useEffect(() => {
    if (privateDetails) addressRef.current?.focus();
  }, [privateDetails]);

  const back = (
    <Link href="/admin/hosts" className={styles.back}>
      <ArrowLeft aria-hidden /> {t("back")}
    </Link>
  );

  if (!state) return back;
  if (!review) {
    return (
      <>
        {back}
        <EmptyState icon={LockKeyhole} title={t("notFound")} />
      </>
    );
  }

  const { host, owner, hours, history } = review;
  const decisions = DECISIONS[host.status] ?? [];
  const ownListing = host.userId === admin.id;
  const errors = result.status === "error" ? result : undefined;
  const euros = (cents: number) =>
    format.number(cents / 100, { style: "currency", currency: "EUR" });

  function reveal() {
    const outcome = revealPrivateDetails(host.id);
    if (outcome.ok) setPrivateDetails(outcome.details);
    else setRevealError(tErrors(outcome.error));
  }

  return (
    <>
      {back}
      <PageHeader
        title={host.displayName}
        subtitle={host.areaLabel ?? undefined}
        actions={<Badge tone={STATUS_TONE[host.status]}>{tStatus(host.status)}</Badge>}
      />

      <div className={styles.columns}>
        <div className={styles.stack}>
          <Card as="section" aria-labelledby="listing-title">
            <h2 id="listing-title" className={styles.cardTitle}>
              {t("listing")}
            </h2>
            <dl className={styles.details}>
              <dt>{t("type")}</dt>
              <dd>
                {tListing(`hostTypes.${host.hostType}`)}
                {host.businessName ? ` · ${host.businessName}` : ""}
              </dd>
              <dt>{t("area")}</dt>
              <dd>{host.areaLabel ?? "—"}</dd>
              <dt>{t("maxSize")}</dt>
              <dd>{tListing(`sizes.${host.maxParcelSize}`)}</dd>
              <dt>{t("maxValue")}</dt>
              <dd>{euros(host.maxDeclaredValueCents)}</dd>
              <dt>{t("capacity")}</dt>
              <dd>{host.maxConcurrentParcels}</dd>
              <dt>{t("rules")}</dt>
              <dd>{host.rulesText ?? t("none")}</dd>
            </dl>
          </Card>

          <Card as="section" aria-labelledby="owner-title">
            <h2 id="owner-title" className={styles.cardTitle}>
              {t("owner")}
            </h2>
            <dl className={styles.details}>
              <dt>{t("owner")}</dt>
              <dd>{owner?.fullName ?? "—"}</dd>
              <dt>{t("email")}</dt>
              <dd>{owner?.email ?? "—"}</dd>
            </dl>
          </Card>

          <Card as="section" aria-labelledby="hours-title">
            <h2 id="hours-title" className={styles.cardTitle}>
              {t("hours")}
            </h2>
            {hours.length === 0 ? (
              <p className={styles.muted}>{t("noHours")}</p>
            ) : (
              <ul className={styles.hours}>
                {hours.map((slot) => (
                  <li key={`${slot.weekday}-${slot.opensAt}`}>
                    <span>{tDays(String(slot.weekday) as "1")}</span>
                    <span>
                      {slot.opensAt}–{slot.closesAt}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card as="section" aria-labelledby="private-title">
            <h2 id="private-title" className={styles.cardTitle}>
              {t("privateAddress")}
            </h2>
            {privateDetails ? (
              <>
                <address ref={addressRef} tabIndex={-1} className={styles.address}>
                  {privateDetails.addressLine1}
                  {privateDetails.addressLine2 && <>, {privateDetails.addressLine2}</>}
                  <br />
                  {privateDetails.postalCode} {privateDetails.city}
                </address>
                {privateDetails.accessInstructions && (
                  <p className={styles.muted}>
                    {t("accessInstructions")}: {privateDetails.accessInstructions}
                  </p>
                )}
                <LocationMap
                  center={privateDetails.exactLocation}
                  zoom={15}
                  interactive={false}
                  highlight={gridCell(privateDetails.exactLocation)}
                  label={t("mapLabel")}
                  className={styles.map}
                />
                <p className={styles.muted}>{t("locationHint")}</p>
              </>
            ) : (
              <>
                <p className={styles.muted}>{t("privateHint")}</p>
                {revealError && (
                  <p className={styles.error} role="alert">
                    {revealError}
                  </p>
                )}
                <Button
                  variant="secondary"
                  onClick={reveal}
                  className={styles.cardAction}
                >
                  <Eye aria-hidden /> {t("showAddress")}
                </Button>
              </>
            )}
          </Card>
        </div>

        <div className={styles.stack}>
          <Card as="section" aria-labelledby="decision-title">
            <h2 id="decision-title" className={styles.cardTitle}>
              {t("decision")}
            </h2>
            {result.status === "success" && (
              <Alert
                variant="success"
                title={t("decided", { status: tStatus(result.newStatus) })}
              />
            )}
            {ownListing ? (
              <p className={styles.muted}>{t("ownListing")}</p>
            ) : decisions.length === 0 ? (
              <p className={styles.muted}>{t("noDecision")}</p>
            ) : (
              <form action={formAction} className={styles.form} noValidate>
                <input type="hidden" name="hostId" value={host.id} />
                {errors?.formError && (
                  <Alert variant="error" title={tErrors(errors.formError)} />
                )}
                <Field
                  label={t("note")}
                  hint={t("noteHint")}
                  error={errors?.noteError && tErrors(errors.noteError)}
                >
                  <Textarea name="note" rows={3} maxLength={1000} />
                </Field>
                <div className={styles.decisions}>
                  {decisions.map((decision) => (
                    <Button
                      key={decision}
                      type="submit"
                      name="decision"
                      value={decision}
                      variant={
                        decision === "reject" || decision === "suspend"
                          ? "danger"
                          : "primary"
                      }
                      disabled={pending}
                    >
                      {t(decision)}
                    </Button>
                  ))}
                </div>
              </form>
            )}
          </Card>

          <Card as="section" aria-labelledby="history-title">
            <h2 id="history-title" className={styles.cardTitle}>
              {t("history")}
            </h2>
            {history.length === 0 ? (
              <p className={styles.muted}>{t("noHistory")}</p>
            ) : (
              <ol className={styles.history}>
                {history.map((entry) => {
                  const key = entry.action.replace("host.", "");
                  const note =
                    typeof entry.details.note === "string" ? entry.details.note : null;
                  return (
                    <li key={entry.id}>
                      <span className={styles.historyAction}>
                        {t("historyEntry", {
                          action: isHistoryAction(key) ? t(`actions.${key}`) : key,
                          name: entry.actorName,
                        })}
                      </span>
                      <time dateTime={entry.createdAt} className={styles.muted}>
                        {format.dateTime(new Date(entry.createdAt), {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </time>
                      {note && <q className={styles.note}>{note}</q>}
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
