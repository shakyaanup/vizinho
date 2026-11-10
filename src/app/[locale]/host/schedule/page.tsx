import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HostSchedule } from "@/features/hosting/components/HostSchedule";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("HostSettings");
  return { title: t("scheduleTitle") };
}

export default function Page() {
  return <HostSchedule />;
}
