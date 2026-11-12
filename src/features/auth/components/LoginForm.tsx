"use client";

import { useTranslations } from "next-intl";
import { useActionState, useSyncExternalStore } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Link } from "@/i18n/navigation";
import { logIn } from "../actions";
import { idleState } from "../form-state";
import { useRedirectOnSuccess } from "../use-redirect-on-success";
import styles from "./auth-form.module.scss";

const noSubscription = () => () => {};

/**
 * ?next= (where to go after logging in), read in the browser. The server
 * renders the form without it (the page is static, also on GitHub Pages),
 * and hydration fills it in. Unlike useSearchParams, this doesn't make React
 * skip server-rendering the form. The action validates it (safeRedirectPath).
 */
function useNextParam() {
  return useSyncExternalStore(
    noSubscription,
    () => new URLSearchParams(window.location.search).get("next") ?? "",
    () => "",
  );
}

export function LoginForm() {
  const next = useNextParam();
  const t = useTranslations("Auth");
  const tCommon = useTranslations("Common");
  const [state, formAction, pending] = useActionState(logIn, idleState);
  useRedirectOnSuccess(state);

  const errors = state.status === "error" ? state : undefined;

  return (
    <form action={formAction} className={styles.form} noValidate>
      <input type="hidden" name="next" value={next} />

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

      <Button
        type="submit"
        size="lg"
        fullWidth
        loading={pending || state.status === "success"}
      >
        {t("login.submit")}
      </Button>

      <p className={styles.footer}>
        {t("login.noAccount")} <Link href="/signup">{t("login.signUpLink")}</Link>
      </p>
    </form>
  );
}
