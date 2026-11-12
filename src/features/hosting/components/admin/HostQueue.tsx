"use client";

import { ChevronRight, Inbox } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Link } from "@/i18n/navigation";
import { useDemoState } from "@/mocks/store";
import {
  hostQueue,
  QUEUE_STATUSES,
  queueCounts,
  STATUS_TONE,
  type QueueStatus,
} from "../../selectors";
import styles from "./admin.module.scss";

/** Admin list of hosts by status; applications waiting for review first. */
export function HostQueue() {
  const t = useTranslations("AdminHosts");
  const tNav = useTranslations("Nav.admin");
  const tStatus = useTranslations("Dashboard.host.status");
  const tTypes = useTranslations("Hosting.listing.hostTypes");
  const format = useFormatter();
  const state = useDemoState();
  const [status, setStatus] = useState<QueueStatus>("pending_review");

  const counts = useMemo(() => state && queueCounts(state.db), [state]);
  const rows = useMemo(() => (state ? hostQueue(state.db, status) : []), [state, status]);

  return (
    <>
      <PageHeader title={tNav("hosts")} subtitle={t("subtitle")} />

      <div role="group" aria-label={t("filterLabel")} className={styles.filters}>
        {QUEUE_STATUSES.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={status === value}
            className={styles.filter}
            onClick={() => setStatus(value)}
          >
            {t(`tabs.${value}`)}
            <span className={styles.count}>{counts?.[value] ?? "–"}</span>
          </button>
        ))}
      </div>

      {state && rows.length === 0 ? (
        <EmptyState icon={Inbox} title={t(`empty.${status}`)} />
      ) : (
        <ul className={styles.list}>
          {rows.map(({ host, ownerName, changedAt }) => (
            <li key={host.id}>
              <Link
                href={{ pathname: "/admin/hosts/review", query: { host: host.id } }}
                className={styles.row}
              >
                <span className={styles.rowMain}>
                  <span className={styles.rowTitle}>{host.displayName}</span>
                  <span className={styles.rowMeta}>
                    {[host.areaLabel, tTypes(host.hostType)].filter(Boolean).join(" · ")}
                  </span>
                  <span className={styles.rowMeta}>
                    {t(status === "pending_review" ? "submitted" : "reviewed", {
                      date: format.dateTime(new Date(changedAt), { dateStyle: "medium" }),
                    })}{" "}
                    {t("ownerLine", { name: ownerName })}
                  </span>
                </span>
                <Badge tone={STATUS_TONE[host.status]}>{tStatus(host.status)}</Badge>
                <ChevronRight aria-hidden className={styles.chevron} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
