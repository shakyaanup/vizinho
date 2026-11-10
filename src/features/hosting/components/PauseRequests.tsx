"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { setPaused } from "../actions";
import type { HostingErrorCode } from "../form-state";
import styles from "./host-settings.module.scss";

type PauseRequestsProps = { paused: boolean; editable: boolean };

/**
 * The host's "not taking new requests" switch. A toggle button (aria-pressed
 * would read oddly here), so the label always says what pressing it does.
 */
export function PauseRequests({ paused, editable }: PauseRequestsProps) {
  const t = useTranslations("HostSettings.pause");
  const tErrors = useTranslations("Hosting.errors");
  // What the last press did, for the status message (null before any press).
  const [done, setDone] = useState<"paused" | "resumed" | null>(null);
  const [error, setError] = useState<HostingErrorCode | null>(null);

  function toggle() {
    const result = setPaused(!paused);
    if (result.ok) {
      setDone(paused ? "resumed" : "paused");
      setError(null);
    } else {
      setError(result.error);
    }
  }

  return (
    <>
      <div className={styles.titleRow}>
        <h2 id="pause-title" className={styles.title}>
          {t("title")}
        </h2>
        {paused && <Badge tone="warning">{t("pausedBadge")}</Badge>}
      </div>
      <p className={styles.status}>{paused ? t("paused") : t("open")}</p>
      {error && <Alert variant="error" title={tErrors(error)} />}
      {editable && (
        <div className={styles.row}>
          <Button variant="secondary" onClick={toggle}>
            {paused ? t("resume") : t("pause")}
          </Button>
          <p className={styles.done} role="status">
            {done === "paused"
              ? t("pausedDone")
              : done === "resumed"
                ? t("resumedDone")
                : ""}
          </p>
        </div>
      )}
    </>
  );
}
