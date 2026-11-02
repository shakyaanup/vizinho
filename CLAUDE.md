# CLAUDE.md — Vizinho

Portugal-first P2P parcel pickup platform. Verified hosts (neighbors/shops) receive parcels for customers, who collect them with a short-lived code. Roles: **customer, host, admin**.

- Spec: `docs/VIZINHO_PROJECT_BRIEF.md`
- Plan, schema, state machine, phases: `docs/DEVELOPMENT_PLAN.md`
- Architecture decisions: `docs/adr/`

## Context

**Portfolio project**, public on GitHub for employers. There are no real users, but build it like a real production app. There's no OTP, SMS, or ID/document verification: auth is email + password, and host "verification" is admin approval. One-click demo logins exist for reviewers. See `docs/DEVELOPMENT_PLAN.md` §0 for all decisions.

## Current status

Architecture approved. **Next: Phase 1 (Foundation).** Implement one phase at a time (plan §9) and stop for review at the end of each phase.

## Working agreement with the owner (always do these)

1. **No tutorial files.** Don't create a `docs/tutorials/` folder.
2. **Explain every step in chat.** After each development step, explain the logic (what was built, why, how the pieces connect) **and the key code written**: the important functions, SQL, and patterns, with short excerpts where they help. It doesn't need to be line by line.

## Non-negotiable rules

1. **No carrier/merchant integrations.** Never invent APIs or tracking for Amazon, CTT, DHL, DPD, etc. Parcel status comes only from host, customer, or admin actions. Never claim in UI copy that a merchant or carrier will accept a host address.
2. **Use mock data** (`supabase/seed.sql`) until the legal and delivery assumptions are validated.
3. **The service-role key never reaches the client.** It's only used in `src/lib/supabase/admin.ts` (imports `server-only`), and only for admin/job code.
4. **RLS on every table**, with no exceptions. A new table without policies + pgTAP tests is incomplete.
5. **State transitions go through Postgres RPC functions** (`SECURITY DEFINER`, `set search_path = ''`, check `auth.uid()`, role, and current state). Clients have no direct UPDATE on `reservations`, `parcels`, or `pickup_tokens`. Each transition writes exactly one `custody_events` row in the same transaction.
6. **`custody_events`, `audit_logs`, and `ledger_entries` are append-only.** Fix mistakes with new rows, never with an UPDATE/DELETE.
7. **Host privacy:** exact address and coordinates live only in `host_private_details`. Customers get the address only via `get_reservation_address()` after acceptance, and every view is logged. Public coordinates are pre-snapped. Never send exact coordinates or exact distances to the client.
8. **Secrets:** pickup tokens/PINs are hashed, expiring, single-use, and attempt-limited. Plaintext is returned once and never logged.
9. **Roles live in `user_roles`**, never in `user_metadata`. Use `has_role()` in SQL and `requireRole()` in server code. Re-check in the DB for sensitive actions, since JWT claims can be stale.
10. **Data minimization (GDPR):** no ID document storage, no IBAN, and no label PII beyond what matching needs. Sentry/analytics must not receive PII. Data stays in EU regions.
11. **Public repo: no secrets committed.** Only `.env.example` is committed. The map stack is deliberately key-free.

## Stack

Next.js (App Router) · TypeScript strict · **SCSS Modules (no Tailwind)** · Radix UI primitives · MapLibre GL + OpenFreeMap + Photon geocoding · Supabase (Auth, Postgres + PostGIS, Storage, Realtime, pg_cron) · `@supabase/ssr` · zod · next-intl (en default, pt-PT) · Vitest · pgTAP · Playwright · pnpm.

## Commands

Requires Node 24 (`.node-version`), pnpm via corepack, and Docker (OrbStack) for Supabase.

```
pnpm dev                 # Next.js dev server (http://localhost:3000)
pnpm build               # production build
pnpm check               # typecheck + eslint + stylelint + prettier check + unit tests (run before every commit)
pnpm typecheck           # next typegen + tsc (typegen creates global types like LayoutProps)
pnpm lint | lint:styles  # ESLint | Stylelint (SCSS)
pnpm format              # Prettier write
pnpm test | test:watch   # Vitest
```

Added in later steps: `pnpm test:e2e` (Playwright), `supabase start | db reset | test db`, `pnpm db:types`.

## Next.js 16.4 specifics (differs from older versions)

- Read `node_modules/next/dist/docs/` before using an unfamiliar API (see AGENTS.md).
- **`middleware.ts` is now `src/proxy.ts`** (export `proxy`, Node runtime). Use it only for session refresh and optimistic redirects, never as the real authorization check.
- **`cacheComponents` is on:** reading `cookies()`/the session must happen inside a `<Suspense>` boundary, not as a top-level `await` in a layout. Request APIs (`cookies`, `headers`, `params`) are async.
- `next lint` no longer exists. Use `pnpm lint`.

## Conventions

- **Layout:** routes in `src/app/{customer,host,admin}`. Domain logic in `src/features/<domain>/{actions,queries,schemas}.ts`. Shared UI in `src/components`.
- **Server first:** default to Server Components. Add `"use client"` only for interactivity. Mutations are Server Actions that zod-validate input and then call an RPC.
- **Migrations:** new timestamped file per change via `supabase migration new`. Never edit a merged migration. Regenerate types after every schema change.
- **Money:** integer cents, EUR. **Time:** `timestamptz`, displayed in `Europe/Lisbon`.
- **Styling:** never Tailwind. Each component is a folder: `Component.tsx` + `Component.module.scss` + `index.ts`. Use tokens from `src/styles/` (`@use "styles/tokens" as *;`, resolved via `sassOptions.loadPaths`), not raw hex/px values. Stylelint forbids hex colors outside the token/theme files. Class names are camelCase. Theme colors are CSS custom properties so light/dark switching works. Write mobile-first media queries via the `respond-to()` mixin.
- **i18n:** no hard-coded user-facing strings. Add keys to both `messages/en.json` and `messages/pt-PT.json`.
- **Accessibility:** WCAG 2.2 AA, semantic HTML, labelled inputs, visible focus, 44px touch targets, no color-only status. Mobile-first: design at 360px width first.
- **Errors:** server actions return typed `{ ok: true, data } | { ok: false, error }` results. Never leak DB errors or PII to the client.
- **Naming:** `snake_case` in SQL, `camelCase` in TS. Component folders/files use `PascalCase` (`Button/Button.tsx`), and all other files use `kebab-case`.
- **Tests:** unit tests sit next to the code as `*.test.ts(x)`.

## Definition of done (per change)

- Typecheck, lint, unit, pgTAP, and e2e (where relevant) all pass.
- New tables/RPCs have pgTAP tests covering **allowed and denied** access for each role.
- No new PII collected without a note in the plan/ADR.
- Logic and key code explained to the owner in chat.
- Docs updated (plan, ADR, or this file) when a decision changes.
