# ADR 0003: Frontend-only, with mock data in the browser

- **Status:** Accepted (supersedes [ADR 0001](0001-authorization-in-the-database.md))
- **Date:** 2026-11-07

## Context

Vizinho is a portfolio project with no real users. Phase 1 and the start of Phase 2 ran on a local Supabase stack (Postgres, Auth, Mailpit) in Docker. On the owner's laptop that stack made development slow and unstable, and every reviewer who clones the repo would need Docker too. The product's value for a portfolio is the frontend: the flows, the UI, accessibility and the business rules, not the hosting.

## Decision

1. **No backend.** Supabase, the migrations, pgTAP tests and Docker are removed. The app is Next.js only and runs anywhere Next.js runs (including Vercel's free tier).
2. **Mock data in the browser.** `src/mocks/seed.ts` builds the same Lisbon network the SQL seed had (21 hosts, 8 reservations, custody history, an incident, a ledger entry), with times relative to now. `src/mocks/store.ts` keeps it as one JSON document in `localStorage`, so changes survive reloads. Every visitor gets their own copy; **Reset demo data** restores the seed.
3. **Business rules move to TypeScript services** (`src/features/<domain>/service.ts`) with the same rules the Postgres functions had: the host state machine, "locked while in review", the four-eyes rule, notes required for negative decisions, audit log entries and notifications. Each change runs in `transact()`, which edits a copy and saves only if no rule was broken, like a database transaction.
4. **Mock auth.** Sign-up and log-in work against accounts stored in the browser (passwords stored as salted SHA-256, never in plain text). The three demo accounts and one-click demo logins stay. There is no email: sign-up signs you in immediately, and the forgot/reset-password pages are removed.
5. **Tests follow the logic.** Unit tests (Vitest) cover the services, the seed's integrity and the store; Playwright covers the flows in a real browser. CI needs no services or secrets.

## Consequences

- Anyone can clone, `pnpm install`, `pnpm dev` and use the whole app. CI is faster and simpler.
- **This is not security.** Anyone can edit `localStorage`, so roles and rules are enforced only for honest use. That's acceptable for a demo with no real data, and the UI copy says data stays in the browser. ADR 0001 remains the design for a real backend: the services mirror its RPCs one to one, so a future backend could replace `transact()` with real API calls.
- Data is per browser and per device; nothing is shared between visitors (no live "host accepts your request" across two people). Flows that need two people are demonstrated by switching accounts in the same browser.
- Server Components still render the static shell, but data-dependent parts are client components that read the store after hydration.
