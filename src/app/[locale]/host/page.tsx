import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HostHome } from "@/features/dashboard/components/HostHome";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Nav.host");
  return { title: t("dashboard") };
}

export default function Page() {
  return <HostHome />;
}
