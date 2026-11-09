<p align="center"><img src="docs/brand/logo.png" alt="Vizinho logo" width="320"></p>

# Vizinho

[![CI](https://github.com/shakyaanup/vizinho/actions/workflows/ci.yml/badge.svg)](https://github.com/shakyaanup/vizinho/actions/workflows/ci.yml)

A Portugal-first, peer-to-peer parcel pickup app. Customers have parcels delivered to a verified neighbour or local shop ("host") and collect them later with a one-time pickup code. Hosts earn a small fee per pickup; admins approve hosts and keep an eye on every parcel's chain of custody.

> **Portfolio project, frontend only.** There is no server or database: the app runs entirely in your browser on mock data, saved in `localStorage`. There are no real users, carriers or payments, and no integrations with merchants or carriers.

- Product brief: [`docs/VIZINHO_PROJECT_BRIEF.md`](docs/VIZINHO_PROJECT_BRIEF.md)
- Roadmap and design: [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md)
- Why frontend-only: [ADR 0003](docs/adr/0003-frontend-only-with-mock-data.md)

## Try it

Run it locally (below) and press **Try as customer / host / admin** on the home page, or log in with a demo account (password `VizinhoDemo2026`):

| Role     | Email                       | What to look at                                                      |
| -------- | --------------------------- | -------------------------------------------------------------------- |
| Customer | `customer@demo.vizinho.app` | Active reservations, "Become a host" application                     |
| Host     | `host@demo.vizinho.app`     | Pending request, parcel in storage, listing details, switching areas |
| Admin    | `admin@demo.vizinho.app`    | Platform overview: hosts awaiting review, open incidents             |

You can also create your own account. Everything you do is saved in your browser only; **Reset demo data** on the account page restores the original data.

The app is available in English (`/`) and European Portuguese (`/pt`), in light and dark mode.

## Features

- **Three role-based areas** (customer, host, admin) with a phone tab bar and a desktop sidebar. Users with several roles switch areas from the account menu.
- **Accounts:** sign-up and log-in with validation, one-click demo logins, and safe redirects back to the page you came from.
- **Become a host:** a multi-step application (listing, opening hours, location, host agreement) with a live checklist. The location step has an Uber-style map (MapLibre + OpenFreeMap), address search (Photon) and "use my current location", and shows the approximate square customers will see. The application is locked while an admin reviews it.
- **Host approval rules:** draft → in review → approved / rejected → suspended / reinstated. Each decision is allowed from one state only, rejections need a reason, admins can't approve their own listing, and every decision is written to an audit log and notifies the other side.
- **Admin review:** a queue of host applications by status, and a review page with the listing, opening hours and review history. The private address and exact map pin are hidden until the admin asks for them, and every view is recorded in the audit log.
- **Location privacy:** customers only ever see a host's position snapped to a ~400 m grid; exact addresses stay private.
- **Bilingual, accessible, mobile-first:** next-intl with typed messages, WCAG 2.2 AA (labelled inputs, visible focus, 44 px touch targets, keyboard-operable menus), designed at 360 px first.

Coming next (see the roadmap): host settings, a map to find hosts nearby, reservations and pickup codes.

## Mock data

[`src/mocks/seed.ts`](src/mocks/seed.ts) builds a small, believable Lisbon network every time the demo starts or is reset:

- **21 hosts** across Alfama, Baixa, Arroios, Alvalade, Belém, Parque das Nações and more: neighbours and local shops with different opening hours, capacities and size limits. 18 are approved, 2 are waiting for review, 1 is suspended.
- **8 reservations** in different states (requested, accepted, waiting for pickup, collected, declined, cancelled), each with its chain-of-custody history, plus an open "damaged parcel" incident and a host earning.
- Times are relative to "now", so the demo always looks current.

People, shops and addresses are invented; coordinates sit on real streets so the map will look plausible.

## How it's built

| Layer      | Choice                                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, Cache Components), React 19, TypeScript (strict)                                  |
| Styling    | SCSS Modules with design tokens and CSS custom-property themes (no Tailwind), Radix UI primitives, Lucide |
| i18n       | next-intl, locale in the URL (`/` English, `/pt` European Portuguese)                                     |
| Validation | zod, with errors as translation keys                                                                      |
| Data       | Typed mock data + a small `localStorage` store with all-or-nothing transactions                           |
| Maps       | MapLibre GL + OpenFreeMap tiles + Photon address search (all free, no API keys)                           |
| Tests      | Vitest + Testing Library (unit), Playwright (end-to-end)                                                  |

The code is organised by feature: `src/features/<domain>/` holds each area's **service** (business rules), **schemas** (zod), **actions** (form handlers) and **components**. The services are pure functions over the mock database, written so a real backend could replace the store later without touching the UI.

## Local setup

Prerequisites: **Node 24** and **pnpm** (`corepack enable`). Nothing else: no Docker, no database, no environment variables.

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

## Quality checks

```bash
pnpm check          # typecheck, ESLint, Stylelint, Prettier, 115 unit tests
pnpm test:e2e       # 31 Playwright tests on a production build (port 3100)
pnpm build
```

The unit tests cover the business rules (the host application state machine, editing locks, the four-eyes rule), the mock data's integrity (snapped pins, consistent custody history, which accounts can sign in) and the store. The end-to-end tests run every role's flows on a phone-sized screen and on desktop, in both languages, and fail on any browser console error. They never call the internet: map tiles and address search are faked, so third-party outages can't make them flaky.

GitHub Actions runs both on every push and pull request.
