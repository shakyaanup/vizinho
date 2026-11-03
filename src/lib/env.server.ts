import "server-only";
import { z } from "zod";

// Server-only secrets. The `server-only` import makes the build fail if any
// client component ever imports this file.
const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
});

export const serverEnv = serverSchema.parse({
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
});
