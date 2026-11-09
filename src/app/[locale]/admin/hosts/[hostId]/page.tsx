import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { HostReview } from "@/features/hosting/components/admin/HostReview";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminHosts");
  return { title: t("reviewTitle") };
}

/** Reads the route param inside Suspense (request data, Cache Components). */
async function ReviewForParam({
  params,
}: Pick<PageProps<"/[locale]/admin/hosts/[hostId]">, "params">) {
  const { hostId } = await params;
  return <HostReview hostId={hostId} />;
}

export default function Page({ params }: PageProps<"/[locale]/admin/hosts/[hostId]">) {
  return (
    <Suspense fallback={<Spinner size="lg" />}>
      <ReviewForParam params={params} />
    </Suspense>
  );
}
