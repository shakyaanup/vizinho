import "server-only";
import type { AppRole } from "@/lib/auth/roles";

// Seeded by supabase/seed.sql. The credentials are deliberately public: they
// power the one-click demo for portfolio reviewers and grant access only to
// mock data. Kept server-side so the buttons never ship a password to the browser.
export const DEMO_PASSWORD = "VizinhoDemo2026";

export const DEMO_ACCOUNTS: Record<AppRole, string> = {
  customer: "customer@demo.vizinho.app",
  host: "host@demo.vizinho.app",
  admin: "admin@demo.vizinho.app",
};
