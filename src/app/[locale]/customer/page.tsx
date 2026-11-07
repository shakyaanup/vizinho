import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CustomerHome } from "@/features/dashboard/components/CustomerHome";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Nav.customer");
  return { title: t("home") };
}

export default function Page() {
  return <CustomerHome />;
}
