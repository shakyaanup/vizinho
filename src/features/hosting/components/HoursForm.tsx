"use client";

import { useTranslations } from "next-intl";
import { useActionState, useId, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { idleState } from "@/lib/forms/form-state";
import { saveHours } from "../actions";
import type { HoursByDay } from "../service";
import { WEEKDAYS, type Weekday } from "../schemas";
import styles from "./hosting.module.scss";

type DayState = { open: boolean; opensAt: string; closesAt: string };

type HoursFormProps = { hoursByDay: HoursByDay; hasListing: boolean; editable: boolean };

// A sensible starting window for days the host switches on.
const DEFAULT_WINDOW = { opensAt: "18:00", closesAt: "21:00" };

export function HoursForm({ hoursByDay, hasListing, editable }: HoursFormProps) {
  const t = useTranslations("Hosting");
  const id = useId();
  const [state, formAction, pending] = useActionState(saveHours, idleState);
  // Controlled, so a failed save keeps exactly what the user set.
  const [days, setDays] = useState(
    () =>
      Object.fromEntries(
        WEEKDAYS.map((day) => {
          const slot = hoursByDay[day];
          return [day, { open: Boolean(slot), ...(slot ?? DEFAULT_WINDOW) }];
        }),
      ) as Record<Weekday, DayState>,
  );

  const update = (day: Weekday, patch: Partial<DayState>) =>
    setDays((current) => ({ ...current, [day]: { ...current[day], ...patch } }));

  const errors = state.status === "error" ? state : undefined;

  if (!hasListing) {
    return <p className={styles.muted}>{t("hours.needListing")}</p>;
  }

  return (
    <form action={formAction} className={styles.form} noValidate>
      <fieldset disabled={!editable} className={styles.fieldset}>
        {errors?.formError && (
          <Alert variant="error" title={t(`errors.${errors.formError}`)} />
        )}

        <ul className={styles.days}>
          {WEEKDAYS.map((day) => {
            const dayName = t(`weekdays.${day}`);
            const { open, opensAt, closesAt } = days[day];
            const code = errors?.fieldErrors?.[`day-${day}`];
            const errorId = code ? `${id}-${day}-error` : undefined;

            return (
              <li key={day} className={styles.day}>
                <label className={styles.dayToggle}>
                  <input
                    type="checkbox"
                    name={`open-${day}`}
                    checked={open}
                    onChange={(event) => update(day, { open: event.target.checked })}
                    className={styles.checkbox}
                  />
                  <span>{t("hours.openOn", { day: dayName })}</span>
                </label>

                {open ? (
                  <div className={styles.times}>
                    <Input
                      type="time"
                      name={`opens-${day}`}
                      value={opensAt}
                      onChange={(event) => update(day, { opensAt: event.target.value })}
                      aria-label={t("hours.opensOn", { day: dayName })}
                      aria-invalid={code ? true : undefined}
                      aria-describedby={errorId}
                    />
                    <span aria-hidden className={styles.timeSeparator}>
                      –
                    </span>
                    <Input
                      type="time"
                      name={`closes-${day}`}
                      value={closesAt}
                      onChange={(event) => update(day, { closesAt: event.target.value })}
                      aria-label={t("hours.closesOn", { day: dayName })}
                      aria-invalid={code ? true : undefined}
                      aria-describedby={errorId}
                    />
                  </div>
                ) : (
                  <span className={styles.closed}>{t("hours.closed")}</span>
                )}

                {code && (
                  <p id={errorId} className={styles.dayError} role="alert">
                    {t(`errors.${code}`)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        {editable && (
          <div className={styles.actions}>
            <Button type="submit" loading={pending}>
              {t("hours.save")}
            </Button>
            {state.status === "success" && !pending && (
              <p className={styles.saved} role="status">
                {t("hours.saved")}
              </p>
            )}
          </div>
        )}
      </fieldset>
    </form>
  );
}
