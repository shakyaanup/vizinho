import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AdminHome } from "@/features/dashboard/components/AdminHome";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Nav.admin");
  return { title: t("overview") };
}

export default function Page() {
  return <AdminHome />;
}
