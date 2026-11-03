"use client";

import { Package, ShieldCheck, Store } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import type { AppRole } from "@/lib/auth/roles";
import { demoLogIn } from "../actions";
import { idleState } from "../form-state";
import styles from "./DemoLogin.module.scss";

const options = [
  { role: "customer", Icon: Package },
  { role: "host", Icon: Store },
  { role: "admin", Icon: ShieldCheck },
] as const satisfies readonly { role: AppRole; Icon: unknown }[];

export function DemoLogin() {
  const t = useTranslations("Home.demo");
  const tErrors = useTranslations("Auth.errors");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(demoLogIn, idleState);
  // Which button was pressed, so only that one shows a spinner.
  const [chosen, setChosen] = useState<AppRole | null>(null);

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="locale" value={locale} />
      {state.status === "error" && state.formError && (
        <Alert variant="error" title={tErrors(state.formError)} />
      )}
      <ul className={styles.list}>
        {options.map(({ role, Icon }) => (
          <li key={role}>
            <Button
              type="submit"
              name="role"
              value={role}
              variant="secondary"
              fullWidth
              className={styles.option}
              loading={pending && chosen === role}
              disabled={pending}
              onClick={() => setChosen(role)}
            >
              <Icon aria-hidden className={styles.icon} />
              <span className={styles.text}>
                <span className={styles.label}>{t(role)}</span>
                <span className={styles.hint}>{t(`${role}Hint`)}</span>
              </span>
            </Button>
          </li>
        ))}
      </ul>
    </form>
  );
}
