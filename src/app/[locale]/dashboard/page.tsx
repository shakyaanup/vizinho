import { getLocale } from "next-intl/server";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { redirect } from "@/i18n/navigation";
import { homePathForRoles } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";

/**
 * Single post-login entry point: sends each user to their own area.
 * The proxy usually redirects before this renders; this is the fallback.
 */
async function RedirectToHome() {
  const user = await requireUser("/dashboard");
  redirect({ href: homePathForRoles(user.roles), locale: await getLocale() });
  return null;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Spinner size="lg" />}>
      <RedirectToHome />
    </Suspense>
  );
}
