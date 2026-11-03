"use client";

import { LogOut } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { signOut } from "../actions";

function SubmitButton() {
  const t = useTranslations("Auth");
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" loading={pending}>
      <LogOut aria-hidden /> {t("signOut")}
    </Button>
  );
}

/** A form (not a link) so signing out is a POST: a stray GET can't log you out. */
export function SignOutButton() {
  const locale = useLocale();
  return (
    <form action={signOut}>
      <input type="hidden" name="locale" value={locale} />
      <SubmitButton />
    </form>
  );
}
