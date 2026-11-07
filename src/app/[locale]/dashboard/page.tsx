"use client";

import { useEffect } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { useRouter } from "@/i18n/navigation";
import { homePathForRoles } from "@/lib/auth/roles";
import { useSession, useSignedOutRedirect } from "@/lib/auth/session";

/** Sends each user to their own area (or to login). For direct visits. */
export default function DashboardPage() {
  const session = useSession();
  const router = useRouter();

  useSignedOutRedirect(session, "/dashboard");

  useEffect(() => {
    if (session.status === "signedIn") {
      router.replace(homePathForRoles(session.user.roles));
    }
  }, [session, router]);

  return <Spinner size="lg" />;
}
