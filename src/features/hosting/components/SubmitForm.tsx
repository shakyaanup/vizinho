"use client";

import { CircleCheck, CircleDashed } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useId } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { idleState } from "@/lib/forms/form-state";
import { submitApplication } from "../actions";
import styles from "./hosting.module.scss";

type Checklist = { listing: boolean; hours: boolean; location: boolean };

type SubmitFormProps = { checklist: Checklist; canSubmit: boolean };

const STEPS = ["listing", "hours", "location"] as const;
const AGREEMENT = ["agreement1", "agreement2", "agreement3", "agreement4"] as const;

export function SubmitForm({ checklist, canSubmit }: SubmitFormProps) {
  const t = useTranslations("Hosting");
  const id = useId();
  const [state, formAction, pending] = useActionState(submitApplication, idleState);
  const complete = STEPS.every((step) => checklist[step]);

  const errors = state.status === "error" ? state : undefined;
  const agreementError = errors?.fieldErrors?.acceptAgreement;

  return (
    <div className={styles.form}>
      <ul className={styles.checklist} aria-label={t("submit.checklistLabel")}>
        {STEPS.map((step) => {
          const done = checklist[step];
          const Icon = done ? CircleCheck : CircleDashed;
          return (
            <li key={step} className={done ? styles.checkDone : styles.checkTodo}>
              <Icon aria-hidden />
              <span>{t(`steps.${step}`)}</span>
              {/* Status in words too, never color or icon alone. */}
              <span className={styles.checkState}>
                {done ? t("submit.done") : t("submit.missing")}
              </span>
            </li>
          );
        })}
      </ul>

      {canSubmit && (
        <form action={formAction} className={styles.form} noValidate>
          {errors?.formError && (
            <Alert variant="error" title={t(`errors.${errors.formError}`)} />
          )}

          <div className={styles.agreement}>
            <h3 className={styles.agreementTitle}>{t("submit.agreementTitle")}</h3>
            <ul>
              {AGREEMENT.map((key) => (
                <li key={key}>{t(`submit.${key}`)}</li>
              ))}
            </ul>
          </div>

          <div className={styles.checkboxRow}>
            <input
              id={`${id}-agree`}
              name="acceptAgreement"
              type="checkbox"
              className={styles.checkbox}
              aria-invalid={agreementError ? true : undefined}
              aria-describedby={agreementError ? `${id}-agree-error` : undefined}
            />
            <label htmlFor={`${id}-agree`}>{t("submit.acceptAgreement")}</label>
            {agreementError && (
              <p id={`${id}-agree-error`} className={styles.dayError} role="alert">
                {t(`errors.${agreementError}`)}
              </p>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={pending}
            disabled={!complete}
            aria-describedby={complete ? undefined : `${id}-incomplete`}
          >
            {t("submit.submit")}
          </Button>
          {!complete && (
            <p id={`${id}-incomplete`} className={styles.muted}>
              {t("submit.incompleteHint")}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
