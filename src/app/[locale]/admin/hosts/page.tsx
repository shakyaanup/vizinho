import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HostQueue } from "@/features/hosting/components/admin/HostQueue";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Nav.admin");
  return { title: t("hosts") };
}

export default function Page() {
  return <HostQueue />;
}
