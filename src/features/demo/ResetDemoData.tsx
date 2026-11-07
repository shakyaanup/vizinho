"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { resetDemoData } from "@/mocks/store";

/** Restores the seed data in this browser. */
export function ResetDemoData() {
  const t = useTranslations("Demo");
  const { toast } = useToast();
  return (
    <Button
      variant="ghost"
      onClick={() => {
        resetDemoData();
        toast({ title: t("resetDone"), variant: "success" });
      }}
    >
      <RotateCcw aria-hidden /> {t("reset")}
    </Button>
  );
}
