# CLAUDE.md — Vizinho

Portugal-first P2P parcel pickup platform. Verified hosts (neighbors/shops) receive parcels for customers, who collect them with a short-lived code. Roles: **customer, host, admin**.

- Spec: `docs/VIZINHO_PROJECT_BRIEF.md`
- Plan, state machine, phases: `docs/DEVELOPMENT_PLAN.md`
- Architecture decisions: `docs/adr/` (**ADR 0003: frontend-only with mock data** is the current architecture)

## Context

**Portfolio project**, public on GitHub for employers. **Frontend only** (since 2026-11-07, ADR 0003): no server, no database, no Docker. All data is mock data in the browser (`localStorage`). There's no email, OTP, SMS or ID verification: auth is a mock email + password against accounts in the store, and host "verification" is admin approval. One-click demo logins exist for reviewers. Build it like a real production app otherwise.

## Current status

**Phase 1 complete.** **Phase 2 in progress** (host onboarding and admin approval, steps in plan §9): the move to frontend-only is done, Step 1 (host review rules, now in `src/features/hosting/service.ts`) is done, and Step 2 (the "Become a host" form) is built. **Next: Step 3, the location picker (MapLibre).** Implement one phase at a time (plan §9) and stop for review at the end of each phase.

## Working agreement with the owner (always do these)

1. **No tutorial files.** Don't create a `docs/tutorials/` folder.
2. **Explain every step in chat.** After each development step, explain the logic (what was built, why, how the pieces connect) **and the key code written**: the important functions and patterns, with short excerpts where they help. It doesn't need to be line by line.
3. **The owner's laptop is low-powered.** Don't introduce Docker, databases or other heavy local services. Keep test runs reasonable.

## Non-negotiable rules

1. **No backend.** Don't add a server, database, API routes or external services that need keys. Data lives in `src/mocks/` and the browser store.
2. **No carrier/merchant integrations.** Never invent APIs or tracking for Amazon, CTT, DHL, DPD, etc. Parcel status comes only from host, customer, or admin actions. Never claim in UI copy that a merchant or carrier will accept a host address.
3. **Business rules live in services** (`src/features/<domain>/service.ts`): pure functions over `DemoDb` that throw `DomainError(code)` when a rule is broken. They mirror the original Postgres RPCs (ADR 0001): check the actor and their roles **from the store** (not from props), check the current state, and write audit logs / custody events / notifications in the same call. Components never mutate the store directly; actions call services through `transact()`.
4. **State transitions follow the state machine** in the plan. Each reservation/parcel transition writes exactly one custody event. `custodyEvents`, `auditLogs` and `ledger` are append-only: fix mistakes with new entries.
5. **Host privacy:** exact addresses and coordinates live only in `hostPrivateDetails`. Customers see `publicLocation` (snapped by `snapToGrid`), never exact coordinates or exact distances.
6. **Secrets stay hashed:** passwords are stored as salted SHA-256 (`features/auth/password.ts`), pickup codes will be stored hashed. Never store or log plaintext.
7. **Roles live on `User.roles`**, never chosen by the user (sign-up always creates a customer). Re-check roles in services.
8. **Data minimization (GDPR mindset):** no ID documents, no IBAN, no label PII beyond what matching needs.
9. **Be honest about the demo:** UI copy and docs say data is mock and stays in the browser. Don't present the mock auth as real security.

## Stack

Next.js 16.4 (App Router) · TypeScript strict · **SCSS Modules (no Tailwind)** · Radix UI primitives · MapLibre GL + OpenFreeMap + Photon geocoding (planned, key-free) · zod · next-intl (en default, pt-PT) · Vitest · Playwright · pnpm.

## Commands

Requires Node 24 (`.node-version`) and pnpm via corepack. Nothing else.

```
pnpm dev                 # Next.js dev server (http://localhost:3000)
pnpm build               # production build
pnpm check               # typecheck + eslint + stylelint + prettier check + unit tests (run before every commit)
pnpm typecheck           # next typegen + tsc (typegen creates global types like LayoutProps)
pnpm lint | lint:styles  # ESLint | Stylelint (SCSS)
pnpm format              # Prettier write
pnpm test | test:watch   # Vitest
pnpm test:e2e            # Playwright: builds, serves on :3100, runs tests/e2e
```

**E2E (`tests/e2e`):** import `test`/`expect` from `./fixtures`, not `@playwright/test`. The fixture fails any test that logs a browser console error (use `consoleErrors.allow(/…/)` for an expected one). Use `visible()` locators, `demoLogin()`, and `signUp()` for flows that change data. Every test gets a fresh browser context, so it starts from the seed and may assert on seed counts (update them when the seed changes). The default viewport is a phone (390×844).

**CI (`.github/workflows/ci.yml`):** `checks` (pnpm check) and `e2e` (build + Playwright) on every push to main and every PR. No services or secrets.

## Next.js 16.4 specifics (differs from older versions)

- Read `node_modules/next/dist/docs/` before using an unfamiliar API (see AGENTS.md).
- **`middleware.ts` is now `src/proxy.ts`** (export `proxy`). Here it only does next-intl locale routing.
- **`cacheComponents` is on:** request APIs (`cookies`, `headers`, `params`, `searchParams`) are async and must be read inside `<Suspense>`.
- `next lint` no longer exists. Use `pnpm lint`.
- Don't read `?query` params with `useSearchParams()` in forms on static pages, because React then skips server-rendering them. Read `searchParams` in the page (inside `<Suspense>`) and pass props down (see the login page).

## Data, session & i18n patterns

- **Mock data:** domain types in `src/mocks/types.ts`, the seed in `src/mocks/seed.ts` (fixed id prefixes: demo users `11111111-`/`22222222-`/`33333333-`, Hugo's listing `44444444-`, host owners `aaaaaaaa-`, host listings `bbbbbbbb-`, customers `cccccccc-`, reservations `dddddddd-`, parcels `eeeeeeee-`; times relative to `now`). Seeded history must stay consistent with the state machine (`seed.test.ts` checks it).
- **Store (`src/mocks/store.ts`):** `useDemoState()` (null during SSR and hydration: render a loading state), `transact(recipe)` for every change (edits a copy, saves only if the recipe doesn't throw), `resetDemoData()`. Derive data with selectors (`src/features/<domain>/selectors.ts`) inside `useMemo`.
- **Who is the user:** `useSession()` / `useCurrentUser()` (inside `RoleGate` only) / `signIn()` / `signOut()` from `@/lib/auth/session`. Selectors and services take the user id from the session, never from URLs or form fields.
- **Guards:** `RoleGate` (client) in each area's shell; `useSignedOutRedirect()` sends visitors who arrive signed out to `/login?next=` and users who sign out to home.
- **Form actions** (`src/features/<domain>/actions.ts`, run in the browser) work with `useActionState`: zod-validate, run the service via `transact()`, return `FormState` with translation keys (`@/lib/forms/form-state`), never raw error text. Auth actions return `redirectTo`; forms navigate with `useRedirectOnSuccess`.
- **React 19 form reset:** `<form action>` forms are reset after every submit. For edit forms with a `<select>` or state-driven fields, dispatch from `onSubmit` + `startTransition` instead (see `ListingForm`).
- **Locale:** URL segment `[locale]` (`/` = en, `/pt` = pt-PT; ADR 0002). Always use `Link`/`redirect`/`useRouter` from `@/i18n/navigation`. Forms that need the locale post a hidden `locale` field (`readLocale`).
- **Redirect targets** from user input go through `safeRedirectPath()` (open-redirect guard).
- **Demo accounts** (password `VizinhoDemo2026`): `customer@`, `host@`, `admin@demo.vizinho.app`.

## App shell & areas

- `/customer`, `/host`, `/admin` each use `<AppShell area="…">` in their `layout.tsx`. The shell (nav, top bar) is a static server component; the user menu and the page (inside `RoleGate`) are client-side.
- Page files stay thin server components (metadata via `getTranslations`) that render a client component from `src/features/<domain>/components/`.
- **Nav items** are defined once in `src/components/layout/AppShell/nav-config.ts` (max 5 per area, for the phone tab bar). Unbuilt sections render `<ComingSoon area section phase />`.
- **Theme:** `useTheme()` (`src/lib/theme`), stored in localStorage and applied pre-paint by `themeInitScript` in `<head>`. `<html>`/`<body>` have `suppressHydrationWarning` for that script and for browser extensions.
- Radix `asChild` needs exactly **one** child element. `DropdownMenuRadioItem` forbids `asChild`; for links in menus use `DropdownMenuItem asChild`.

## Conventions

- **UI kit:** `src/components/ui/` has Alert, Avatar, Badge, Button, Card, Dialog, DropdownMenu, EmptyState, Field, Input, Logo, PasswordInput, Select, Spinner, StatCard, Toast. Layout pieces live in `src/components/layout/` (AppShell, PageHeader, ComingSoon, LocaleSwitcher). Check there before building new UI, and preview everything at `/styleguide`. Components never hard-code user-facing text. Accessible labels (e.g. `closeLabel`) are props so callers pass translated strings.
- **Brand:** use `<Logo />` (inline SVG, `currentColor`, follows the theme), never the raw image. Source artwork is `docs/brand/logo.png`. App icons are `src/app/favicon.ico` (16/32/48), `icon.svg` and `apple-icon.png`, generated from the same traced path.
- **Layout:** routes in `src/app/[locale]/{customer,host,admin}`. Domain logic in `src/features/<domain>/{service,selectors,actions,schemas}.ts` + `components/`. Shared UI in `src/components`.
- **Money:** integer cents, EUR. **Time:** ISO strings in UTC, displayed in `Europe/Lisbon`.
- **Styling:** never Tailwind. Each component is a folder: `Component.tsx` + `Component.module.scss` + `index.ts`. Use tokens from `src/styles/` (`@use "styles/tokens" as *;`, resolved via `sassOptions.loadPaths`), not raw hex/px values. Stylelint forbids hex colors outside the token/theme files. Class names are camelCase. Theme colors are CSS custom properties so light/dark switching works. Write mobile-first media queries via the `respond-to()` mixin.
- **i18n:** no hard-coded user-facing strings. Add keys to both `src/messages/en.json` and `src/messages/pt-PT.json` (European Portuguese). A unit test fails if the key sets or `{placeholders}` differ.
- **Accessibility:** WCAG 2.2 AA, semantic HTML, labelled inputs, visible focus, 44px touch targets, no color-only status. Mobile-first: design at 360px width first.
- **Naming:** `camelCase` in TS. Component folders/files use `PascalCase` (`Button/Button.tsx`), and all other files use `kebab-case`.
- **Tests:** unit tests sit next to the code as `*.test.ts(x)`. Every service rule gets allowed **and** refused cases.

## Definition of done (per change)

- Typecheck, lint, unit and e2e (where relevant) all pass.
- New service rules have unit tests for allowed and refused paths.
- Logic and key code explained to the owner in chat.
- Docs updated (plan, ADR, or this file) when a decision changes.
