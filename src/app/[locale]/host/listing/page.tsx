import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HostListingSettings } from "@/features/hosting/components/HostListingSettings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("HostSettings");
  return { title: t("listingTitle") };
}

export default function Page() {
  return <HostListingSettings />;
}
