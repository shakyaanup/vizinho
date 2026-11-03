"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Link } from "@/i18n/navigation";
import { logIn } from "../actions";
import { idleState } from "../form-state";
import styles from "./auth-form.module.scss";

type LoginFormProps = {
  /** Where to go after logging in (validated again on the server). */
  next?: string;
  /** Set when arriving from an expired/used email link. */
  linkInvalid?: boolean;
};

export function LoginForm({ next = "", linkInvalid = false }: LoginFormProps) {
  const t = useTranslations("Auth");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(logIn, idleState);

  const errors = state.status === "error" ? state : undefined;

  return (
    <form action={formAction} className={styles.form} noValidate>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="next" value={next} />

      {linkInvalid && !errors && (
        <Alert variant="error" title={t("errors.linkInvalid")} />
      )}
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

      <Field
        label={t("password")}
        error={
          errors?.fieldErrors?.password && t(`errors.${errors.fieldErrors.password}`)
        }
      >
        <PasswordInput
          name="password"
          autoComplete="current-password"
          showLabel={tCommon("showPassword")}
          hideLabel={tCommon("hidePassword")}
        />
      </Field>

      <Link href="/forgot-password" className={styles.inlineLink}>
        {t("login.forgotPassword")}
      </Link>

      <Button type="submit" size="lg" fullWidth loading={pending}>
        {t("login.submit")}
      </Button>

      <p className={styles.footer}>
        {t("login.noAccount")} <Link href="/signup">{t("login.signUpLink")}</Link>
      </p>
    </form>
  );
}
