"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { idleState } from "@/lib/forms/form-state";
import { lisbonDate, lisbonMidnight } from "@/lib/time/lisbon";
import { addTimeOff, removeTimeOff } from "../actions";
import type { HostingErrorCode } from "../form-state";
import type { TimeOffField } from "../schemas";
import type { upcomingTimeOff } from "../selectors";
import styles from "./hosting.module.scss";
import settings from "./host-settings.module.scss";

type Period = ReturnType<typeof upcomingTimeOff>[number];

type TimeOffProps = { periods: Period[]; editable: boolean };

export function TimeOff({ periods, editable }: TimeOffProps) {
  const t = useTranslations("HostSettings.timeOff");
  const tErrors = useTranslations("Hosting.errors");
  const format = useFormatter();
  const [removeError, setRemoveError] = useState<HostingErrorCode | null>(null);
  const [removed, setRemoved] = useState(false);

  // Whole days, so format Lisbon midnights as dates ("12–18 Dec 2026").
  const range = (period: Period) =>
    format.dateTimeRange(
      new Date(lisbonMidnight(period.firstDay)),
      new Date(lisbonMidnight(period.lastDay)),
      { day: "numeric", month: "short", year: "numeric" },
    );

  function remove(id: string) {
    const result = removeTimeOff(id);
    setRemoved(result.ok);
    setRemoveError(result.ok ? null : result.error);
  }

  return (
    <>
      {periods.length > 0 ? (
        <ul className={settings.periods} aria-label={t("listLabel")}>
          {periods.map((period) => (
            <li key={period.id} className={settings.period}>
              <div className={settings.periodText}>
                <span className={settings.periodRange}>
                  {range(period)}
                  {period.current && <Badge tone="warning">{t("now")}</Badge>}
                </span>
                {period.reason && (
                  <span className={settings.periodReason}>{period.reason}</span>
                )}
              </div>
              {editable && (
                <Button
                  variant="ghost"
                  onClick={() => remove(period.id)}
                  aria-label={t("removeLabel", { range: range(period) })}
                >
                  {t("remove")}
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className={settings.empty}>{t("empty")}</p>
      )}
      {removeError && <Alert variant="error" title={tErrors(removeError)} />}
      <p className={styles.saved} role="status">
        {removed ? t("removed") : ""}
      </p>

      {editable && <AddTimeOffForm onAdded={() => setRemoved(false)} />}
    </>
  );
}

function AddTimeOffForm({ onAdded }: { onAdded: () => void }) {
  const t = useTranslations("HostSettings.timeOff");
  const tErrors = useTranslations("Hosting.errors");
  const [state, formAction, pending] = useActionState(
    async (prev: Parameters<typeof addTimeOff>[0], formData: FormData) => {
      const next = await addTimeOff(prev, formData);
      if (next.status === "success") onAdded();
      return next;
    },
    idleState,
  );

  const errors = state.status === "error" ? state : undefined;
  // React resets the form after each submit: on success that clears it, and
  // after an error the defaults below put back what the host typed.
  const value = (field: TimeOffField) => errors?.values?.[field] ?? "";
  const fieldError = (field: TimeOffField) => {
    const code = errors?.fieldErrors?.[field];
    return code ? tErrors(code) : undefined;
  };
  const today = lisbonDate(new Date());

  return (
    <form action={formAction} className={styles.form} noValidate>
      <h3 className={settings.addTitle}>{t("add")}</h3>
      {errors?.formError && <Alert variant="error" title={tErrors(errors.formError)} />}
      <div className={styles.pair}>
        <Field label={t("startDate")} error={fieldError("startDate")}>
          <Input
            type="date"
            name="startDate"
            min={today}
            defaultValue={value("startDate")}
          />
        </Field>
        <Field label={t("endDate")} error={fieldError("endDate")}>
          <Input type="date" name="endDate" min={today} defaultValue={value("endDate")} />
        </Field>
      </div>
      <Field label={t("reason")} hint={t("reasonHint")} error={fieldError("reason")}>
        <Input name="reason" maxLength={100} defaultValue={value("reason")} />
      </Field>
      <div className={styles.actions}>
        <Button type="submit" loading={pending}>
          {t("add")}
        </Button>
        {state.status === "success" && !pending && (
          <p className={styles.saved} role="status">
            {t("added")}
          </p>
        )}
      </div>
    </form>
  );
}
