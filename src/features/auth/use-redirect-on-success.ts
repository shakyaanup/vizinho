import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

/** After a successful auth action, go where it says (replace: no back-button loop). */
export function useRedirectOnSuccess(state: { status: string; redirectTo?: string }) {
  const router = useRouter();
  useEffect(() => {
    if (state.status === "success" && state.redirectTo) router.replace(state.redirectTo);
  }, [state, router]);
}
