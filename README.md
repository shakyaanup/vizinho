# Vizinho

[![CI](https://github.com/shakyaanup/vizinho/actions/workflows/ci.yml/badge.svg)](https://github.com/shakyaanup/vizinho/actions/workflows/ci.yml)

A Portugal-first, peer-to-peer parcel pickup platform: customers have parcels delivered to a verified neighbor or local shop and collect them with a short-lived pickup code.

> **Portfolio project.** There are no real users, carriers, or payments. All hosts and parcels are mock data.

- Product brief: [`docs/VIZINHO_PROJECT_BRIEF.md`](docs/VIZINHO_PROJECT_BRIEF.md)
- Architecture, schema and roadmap: [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md)

## Try it

Open the app and press **Try as customer / host / admin** on the home page, or log in with one of the seeded demo accounts (password `VizinhoDemo2026`):

| Role     | Email                       |
| -------- | --------------------------- |
| Customer | `customer@demo.vizinho.app` |
| Host     | `host@demo.vizinho.app`     |
| Admin    | `admin@demo.vizinho.app`    |

The app is available in English (`/`) and European Portuguese (`/pt`).

### Mock data

`supabase/seed.sql` creates a small, believable network so every screen has something to show:

- **21 hosts** across Lisbon (Alfama, Baixa, Arroios, Alvalade, Belém, Parque das Nações, …): neighbours and local shops with different opening hours, capacities and size limits. 18 are approved, 2 wait for admin review, and 1 is suspended.
- **8 reservations** in different states (requested, accepted, waiting for pickup, collected, declined, cancelled), each with its chain-of-custody history, plus one open "damaged parcel" incident and a host earning.
- Public map pins are snapped to a ~400 m grid; exact addresses stay private.

People, shops and addresses are invented. There are no carrier or merchant integrations.

## Tech stack

Next.js 16 (App Router, Cache Components) · TypeScript · SCSS Modules · Radix UI · next-intl · Supabase (Postgres, Auth, RLS) · zod · Vitest · pgTAP · Playwright

## Local setup

Prerequisites: **Node 24**, **pnpm** (`corepack enable`), **Docker** (e.g. OrbStack).

```bash
pnpm install
pnpm db:start       # local Supabase in Docker (first run downloads images)
cp .env.example .env.local   # then paste the keys printed by `pnpm db:status`
pnpm dev            # http://localhost:3000
```

Local services: Supabase Studio http://127.0.0.1:54323 · email inbox (Mailpit) http://127.0.0.1:54324

## Quality checks

```bash
pnpm check          # typecheck, ESLint, Stylelint, Prettier, unit tests
pnpm db:test        # 88 pgTAP assertions: RLS, grants, append-only logs, seed integrity
pnpm test:e2e       # 24 Playwright tests on a production build (port 3100)
pnpm build
```

`pnpm test:e2e` needs local Supabase running with the seed loaded (`pnpm db:reset`). It checks every role's flows on a phone-sized screen and desktop, the sign-up → email confirmation → password reset loop through Mailpit, keyboard use, and it fails on any browser console error.

GitHub Actions runs all of the above on every push and pull request, against a fresh local Supabase stack on the runner (no secrets needed).

## Security model

Authorization is enforced in Postgres, not just in app code: deny-by-default grants, Row Level Security on every table, state changes only through audited RPCs, and append-only custody/audit logs. See [ADR 0001](docs/adr/0001-authorization-in-the-database.md).
