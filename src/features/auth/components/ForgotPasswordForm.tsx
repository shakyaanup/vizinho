"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Link } from "@/i18n/navigation";
import { requestPasswordReset } from "../actions";
import { idleState } from "../form-state";
import styles from "./auth-form.module.scss";

export function ForgotPasswordForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(requestPasswordReset, idleState);

  if (state.status === "success") {
    return (
      <div className={styles.form}>
        <Alert variant="success" title={t("forgot.successTitle")}>
          <p>{t("forgot.successBody", { email: state.email ?? "" })}</p>
        </Alert>
        <p className={styles.footer}>
          <Link href="/login">{t("forgot.backToLogin")}</Link>
        </p>
      </div>
    );
  }

  const errors = state.status === "error" ? state : undefined;

  return (
    <form action={formAction} className={styles.form} noValidate>
      <input type="hidden" name="locale" value={locale} />

      {errors?.formError && (
        <Alert variant="error" title={t(`errors.${errors.formError}`)} />
      )}

      <Field
        label={t("email")}
        error={errors?.fieldErrors?.email && t(`errors.${errors.fieldErrors.email}`)}
      >
        <Input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          defaultValue={errors?.values?.email}
        />
      </Field>

      <Button type="submit" size="lg" fullWidth loading={pending}>
        {t("forgot.submit")}
      </Button>

      <p className={styles.footer}>
        <Link href="/login">{t("forgot.backToLogin")}</Link>
      </p>
    </form>
  );
}
