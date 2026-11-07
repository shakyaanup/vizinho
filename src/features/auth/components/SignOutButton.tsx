"use client";

import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { useRouter } from "@/i18n/navigation";
import { signOut } from "@/lib/auth/session";

export function SignOutButton() {
  const t = useTranslations("Auth");
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      onClick={() => {
        router.replace("/");
        signOut();
      }}
    >
      <LogOut aria-hidden /> {t("signOut")}
    </Button>
  );
}
