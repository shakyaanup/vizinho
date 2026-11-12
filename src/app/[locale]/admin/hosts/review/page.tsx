import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { HostReviewFromQuery } from "@/features/hosting/components/admin/HostReview";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminHosts");
  return { title: t("reviewTitle") };
}

/**
 * /admin/hosts/review?host=<id>. The id is a query parameter rather than a
 * path segment so the page can be exported as static files (GitHub Pages):
 * new applications get random ids that don't exist at build time. The page
 * reads it in the browser, which is where all demo data lives anyway.
 */
export default function Page() {
  return (
    <Suspense fallback={<Spinner size="lg" />}>
      <HostReviewFromQuery />
    </Suspense>
  );
}
