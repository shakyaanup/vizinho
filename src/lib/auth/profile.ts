import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "./session";

/**
 * The signed-in user's profile row (RLS returns only their own).
 * Cached per request: the header and the page can both ask for it.
 */
export const getCurrentProfile = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("full_name, locale")
    .eq("id", user.id)
    .single();

  return {
    ...user,
    fullName: data?.full_name ?? user.email ?? "",
  };
});
