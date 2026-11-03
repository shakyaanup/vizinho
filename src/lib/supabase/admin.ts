import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import type { Database } from "@/types/database";

/**
 * Privileged client: uses the SECRET key and BYPASSES Row Level Security.
 * Only for trusted server jobs (e.g. resetting demo data). Never use it to
 * serve a user's request: use `@/lib/supabase/server` so RLS applies.
 */
export function createAdminClient() {
  return createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
