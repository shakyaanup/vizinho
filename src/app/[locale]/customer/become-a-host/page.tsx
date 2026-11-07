import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BecomeAHost } from "@/features/hosting/components/BecomeAHost";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Hosting");
  return { title: t("title") };
}

export default function Page() {
  return <BecomeAHost />;
}
