import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/Alert";

/** Why a host's settings are read-only, with the admin's reason. */
export function SuspendedNotice({ note }: { note: string | null }) {
  const t = useTranslations("HostSettings");
  return (
    <Alert variant="error" title={t("suspendedTitle")}>
      {note && <p>{t("reviewNote", { note })}</p>}
      <p>{t("suspendedBody")}</p>
    </Alert>
  );
}
