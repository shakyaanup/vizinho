"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { updatePassword } from "../actions";
import { idleState } from "../form-state";
import styles from "./auth-form.module.scss";

export function ResetPasswordForm() {
  const t = useTranslations("Auth");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(updatePassword, idleState);
  const errors = state.status === "error" ? state : undefined;

  return (
    <form action={formAction} className={styles.form} noValidate>
      <input type="hidden" name="locale" value={locale} />

      {errors?.formError && (
        <Alert variant="error" title={t(`errors.${errors.formError}`)} />
      )}

      <Field
        label={t("reset.newPassword")}
        hint={t("signup.passwordHint")}
        error={
          errors?.fieldErrors?.password && t(`errors.${errors.fieldErrors.password}`)
        }
      >
        <PasswordInput
          name="password"
          autoComplete="new-password"
          showLabel={tCommon("showPassword")}
          hideLabel={tCommon("hidePassword")}
        />
      </Field>

      <Button type="submit" size="lg" fullWidth loading={pending}>
        {t("reset.submit")}
      </Button>
    </form>
  );
}
