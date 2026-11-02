# Vizinho

A Portugal-first, peer-to-peer parcel pickup platform: customers have parcels delivered to a verified neighbor or local shop and collect them with a short-lived pickup code.

> **Portfolio project.** There are no real users, carriers, or payments. All hosts and parcels are mock data.

- Product brief: [`docs/VIZINHO_PROJECT_BRIEF.md`](docs/VIZINHO_PROJECT_BRIEF.md)
- Architecture, schema and roadmap: [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md)

## Tech stack

Next.js 16 (App Router) · TypeScript · SCSS Modules · Supabase (Postgres, Auth, RLS) · Vitest

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
pnpm db:test        # 81 pgTAP assertions: RLS, grants, append-only logs
pnpm build
```

## Security model

Authorization is enforced in Postgres, not just in app code: deny-by-default grants, Row Level Security on every table, state changes only through audited RPCs, and append-only custody/audit logs. See [ADR 0001](docs/adr/0001-authorization-in-the-database.md).
