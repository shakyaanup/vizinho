"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState, useId } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Link } from "@/i18n/navigation";
import { signUp } from "../actions";
import { idleState } from "../form-state";
import { useRedirectOnSuccess } from "../use-redirect-on-success";
import styles from "./auth-form.module.scss";

export function SignupForm() {
  const t = useTranslations("Auth");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const termsErrorId = useId();
  const [state, formAction, pending] = useActionState(signUp, idleState);
  useRedirectOnSuccess(state);

  const errors = state.status === "error" ? state : undefined;
  const fieldError = (field: "fullName" | "email" | "password" | "acceptTerms") => {
    const code = errors?.fieldErrors?.[field];
    return code ? t(`errors.${code}`) : undefined;
  };

  return (
    <form action={formAction} className={styles.form} noValidate>
      <input type="hidden" name="locale" value={locale} />

      {errors?.formError && (
        <Alert variant="error" title={t(`errors.${errors.formError}`)} />
      )}

      <Field label={t("signup.fullName")} error={fieldError("fullName")}>
        <Input
          name="fullName"
          autoComplete="name"
          defaultValue={errors?.values?.fullName}
        />
      </Field>

      <Field label={t("email")} error={fieldError("email")}>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          defaultValue={errors?.values?.email}
        />
      </Field>

      <Field
        label={t("password")}
        hint={t("signup.passwordHint")}
        error={fieldError("password")}
      >
        <PasswordInput
          name="password"
          autoComplete="new-password"
          showLabel={tCommon("showPassword")}
          hideLabel={tCommon("hidePassword")}
        />
      </Field>

      <div className={styles.checkboxRow}>
        <input
          id={`${termsErrorId}-terms`}
          name="acceptTerms"
          type="checkbox"
          className={styles.checkbox}
          defaultChecked={errors?.values?.acceptTerms === "on"}
          aria-invalid={fieldError("acceptTerms") ? true : undefined}
          aria-describedby={fieldError("acceptTerms") ? termsErrorId : undefined}
        />
        <label htmlFor={`${termsErrorId}-terms`} className={styles.checkboxLabel}>
          {t("signup.acceptTerms")}
        </label>
        {fieldError("acceptTerms") && (
          <p id={termsErrorId} className={styles.checkboxError} role="alert">
            {fieldError("acceptTerms")}
          </p>
        )}
      </div>

      <Button
        type="submit"
        size="lg"
        fullWidth
        loading={pending || state.status === "success"}
      >
        {t("signup.submit")}
      </Button>

      <p className={styles.footer}>
        {t("signup.haveAccount")} <Link href="/login">{t("signup.logInLink")}</Link>
      </p>
    </form>
  );
}
