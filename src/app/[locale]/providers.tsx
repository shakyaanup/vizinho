"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";

/** Client-side providers shared by every page. */
export function Providers({ children }: { children: ReactNode }) {
  const t = useTranslations("Common");
  return (
    <ToastProvider closeLabel={t("dismiss")} viewportLabel={t("notifications")}>
      {children}
    </ToastProvider>
  );
}
