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
cp .env.example .env.local
pnpm dev            # http://localhost:3000
```

## Quality checks

```bash
pnpm check          # typecheck, ESLint, Stylelint, Prettier, unit tests
pnpm build
```
