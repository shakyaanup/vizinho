# Vizinho — Development Plan (v0.1, for review)

Status: **APPROVED (with the changes in §0). Phase 1 complete (2026-11-05). Frontend-only since 2026-11-07. Phase 2 complete (2026-11-10).**

> **Architecture change, 2026-11-07 ([ADR 0003](adr/0003-frontend-only-with-mock-data.md)).** The project is now **frontend-only**: no Supabase, no database, no Docker. Data is mock data in the browser (`src/mocks/`), and the business rules that were Postgres functions and RLS policies are TypeScript services with the same rules. Sections §6–§8 below describe the original backend design; they're kept as the blueprint for a future real backend, and where they mention tables, RLS or RPCs, read "the `DemoDb` collections and services" instead.
> Source: `docs/VIZINHO_PROJECT_BRIEF.md` (`docs/conversation.md` was referenced but does not exist in the repo).

---

## 0. Decisions — 2026-10-16 (these override anything below)

**Context:** Vizinho is a **portfolio project** that will be public on GitHub for employers to review. There are no real users. It should still be built and behave like a realistic production app.

| Topic                | Decision                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Users / legal        | No real users or transactions. The legal and business risks in §3–§4 stay documented as product thinking, but they don't block development.                                                                                                                                                                                                                                                 |
| Auth                 | **Email + password** (Supabase Auth). No email OTP and no SMS. Local email confirmation is captured by Supabase's built-in mail catcher (Mailpit).                                                                                                                                                                                                                                          |
| Phone                | A phone number is collected on the profile but **not verified**.                                                                                                                                                                                                                                                                                                                            |
| Host verification    | No document checks. An admin approves or rejects applications in the admin panel, and that is the "verification".                                                                                                                                                                                                                                                                           |
| Demo access          | **One-click "Try as Customer / Host / Admin" demo logins** on the landing page, backed by seeded accounts. A scheduled job resets the demo data. Employers can explore the app without signing up.                                                                                                                                                                                          |
| Styling              | **No Tailwind.** **SCSS Modules**, one `Component.module.scss` per component. Global design tokens (colors, spacing, type, radii, breakpoints) live as SCSS variables and are exposed as CSS custom properties for light/dark theming.                                                                                                                                                      |
| UI primitives        | **Radix UI primitives** (unstyled) for accessible dialogs, menus, tabs, toasts, etc., styled with SCSS. No shadcn (it depends on Tailwind).                                                                                                                                                                                                                                                 |
| Map                  | **Uber-style full-screen map** with **MapLibre GL JS** + **OpenFreeMap** vector tiles (free, no API key). The user's location comes from the browser Geolocation API, with a fallback to manual search or the Lisbon center. Address search uses **Photon** (OSM geocoder, no key). Hosts are shown as approximate markers, and selecting one opens a bottom sheet with the host's details. |
| Notifications        | In-app notifications via **Supabase Realtime**. No email or SMS delivery.                                                                                                                                                                                                                                                                                                                   |
| Languages            | **English default**, pt-PT second (`next-intl`).                                                                                                                                                                                                                                                                                                                                            |
| Pilot area           | Seed data covers several Lisbon neighborhoods (Arroios, Alvalade, Campo de Ourique, Graça).                                                                                                                                                                                                                                                                                                 |
| Defaults M1–M16 (§2) | Accepted as proposed, except for the items changed above (M7 phone verification dropped, M8 → password, M10 → admin approval only).                                                                                                                                                                                                                                                         |
| Hosting              | GitHub (public repo) + Vercel + Supabase free tier (EU) for a live demo.                                                                                                                                                                                                                                                                                                                    |
| Architecture         | **Frontend-only with mock data in the browser** (2026-11-07, ADR 0003). The owner's laptop can't run the local Supabase/Docker stack, and the portfolio value is in the frontend. Email-based flows (confirmation, password reset) are dropped; sign-up signs in immediately.                                                                                                               |
| Learning             | No tutorial files. The logic and key code of each step are explained in chat instead (updated 2026-11-02).                                                                                                                                                                                                                                                                                  |

---

## 1. What we are building (restated)

A pilot-grade, mobile-first PWA where:

- **Customers** find a nearby verified host, request a reservation, and use the host's address at a merchant checkout once the host accepts.
- **Hosts** (neighbors or shops) accept or decline each reservation, check parcels in, and hand them over against a short-lived pickup code.
- **Admins** approve hosts, resolve incidents, audit custody, and keep a manual payout ledger.

The platform never talks to merchants or carriers. Every parcel status comes from a host action, a customer-provided field, or an admin action.

---

## 2. Missing requirements (need answers or a default)

| #   | Gap                                                                                                                                                             | Why it matters                                                                                  | Proposed default                                                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | **Storage period and unclaimed-parcel policy.** How long does a host keep a parcel, and what happens after that (return to sender, admin escalation, disposal)? | It drives the expiry jobs, host liability and the wording in the terms.                         | 7 days after check-in, then `unclaimed` status and an admin incident. There's no automated return.                                                        |
| M2  | **Reservation timing window.** How far ahead can a customer book, how long does the host have to respond, and what grace period applies to late deliveries?     | "Expiring reservation reference" needs real numbers. Carrier dates slip often.                  | Book up to 14 days ahead. The host has 24 h to respond. The reservation expires 5 days after the expected delivery date if no parcel has arrived.         |
| M3  | **Parcels per reservation.** Orders often ship split (e.g. marketplace orders).                                                                                 | It shapes the schema and the handover UX.                                                       | A reservation can hold 1..N parcels. The host can add a parcel to an active reservation. Handover collects every parcel that's ready.                     |
| M4  | **How the reference appears on the label.** Is it in the name line ("Ana Silva c/o VZ-7K3QPM"), in address line 2, or is there no reference at all?             | Hosts match parcels on it. Merchants may truncate or reject the field.                          | Recommend name + `VZ-XXXXXX` in address line 2. Track failed attempts as a pilot metric, as the brief says.                                               |
| M5  | **Proxy pickup.** Can someone other than the customer collect?                                                                                                  | It's a common real-world need and a fraud/dispute vector.                                       | Not in the MVP. Only the account holder's code works. Host may optionally ask for ID.                                                                     |
| M6  | **Languages.**                                                                                                                                                  | Portugal-first, but the early adopters are likely to include expats.                            | pt-PT is the default and English is the second language, both from day 1 via `next-intl`.                                                                 |
| M7  | **Phone verification provider.** The brief requires a verified phone but defers SMS.                                                                            | You can't verify a phone without SMS/WhatsApp OTP, and it costs money.                          | Supabase phone OTP via Twilio (or Vonage). Required **before a user's first reservation or host application**, not at signup. Stubbed locally.            |
| M8  | **Auth method.** "Email login" is underspecified.                                                                                                               | Magic links open in the browser rather than the installed PWA, which breaks the session on iOS. | Email + 6-digit OTP code (no password). Optional password later.                                                                                          |
| M9  | **Pricing in the pilot.**                                                                                                                                       | It decides whether "earnings" means real money.                                                 | Free for customers in the pilot. Hosts get a fixed per-parcel amount recorded in the manual ledger and paid off-platform.                                 |
| M10 | **Host verification method and data retention.**                                                                                                                | Storing ID documents is high-risk under GDPR.                                                   | Pilot: manual review (in person or video call). Store **only** "verified by admin X on date Y via method Z". Don't upload ID images.                      |
| M11 | **Host payout details.**                                                                                                                                        | An IBAN is financial PII.                                                                       | Not stored in the MVP. Payouts are handled off-platform, and the ledger only records amounts.                                                             |
| M12 | **Can one account be both customer and host?**                                                                                                                  | It affects the role model.                                                                      | Yes. Roles are additive, and the UI has a role switcher.                                                                                                  |
| M13 | **Pilot geography.**                                                                                                                                            | It decides whether maps are needed at all in v1.                                                | One Lisbon or Porto neighborhood. A list view sorted by distance comes first, and the map comes in Phase 3.                                               |
| M14 | **Prohibited items and value cap.**                                                                                                                             | The host can't inspect contents.                                                                | A platform-wide prohibited list (customer attests to it) plus a per-host max declared value (default €200).                                               |
| M15 | **Account deletion while parcels are in custody.**                                                                                                              | GDPR erasure conflicts with an open custody chain.                                              | Block deletion while reservations are active. After that, pseudonymize the profile and keep the custody/audit rows for a defined retention period.        |
| M16 | **Host absence when the courier arrives.**                                                                                                                      | Neighbors aren't home all day, so the delivery fails.                                           | Hosts declare hours. Reservations can only target dates that fall inside the hours. "Failed delivery" is a customer-reported status and a tracked metric. |

---

## 3. Contradictions and tensions in the brief

1. **"Conceal the exact residential address" vs. the core flow.** The customer _must_ receive the full address to enter it at checkout, and once it's revealed it can't be taken back. The concealment only delays exposure. It doesn't prevent it.
   _Mitigation:_ reveal only to phone-verified customers after host acceptance. Log every address view in `audit_logs`. Let hosts block customers. **Strongly consider a shops-first pilot**, where the address is already public.
2. **"Verified phone number" vs. "SMS later."** Phone verification needs SMS (or WhatsApp) in the MVP. Only SMS _notifications_ can wait.
3. **"Avoid collecting label personal data" vs. "host checks the label against a reservation" and "photo of package exterior."** The label is the matching key, and a photo of the exterior will usually capture it.
   _Mitigation:_ the host types or scans the reference code and shoots the photo following on-screen guidance ("frame the package, not the label"). Photos sit in a private bucket with short retention (e.g. 30 days after collection, unless an incident is open).
4. **"Unique, expiring reservation reference" vs. merchant/carrier reality.** The customer may have to enter the reference into a merchant system weeks before the parcel arrives, and some carriers deliver late. Expiry needs a grace window (M2), and late parcels need an incident path rather than a hard reject.
5. **"Approximate host pins" vs. distance search.** If exact coordinates reach the client in any form (API response, map tile, sort order with distance), the location can be triangulated.
   _Mitigation:_ exact coordinates live in a private table. Public coordinates are snapped to a ~400 m grid once, at approval time. Distances are computed from the snapped point and rounded.
6. **"Immutable audit trail" vs. "handle deletion requests."** These are reconcilable through pseudonymization, but the retention period needs a legal answer.
7. **Timeline.** The brief's Month 1 is a _manual concierge pilot_. Software is Month 2. That's sensible: the build shouldn't block learning whether carriers will deliver to these addresses at all.

---

## 4. Business and operational risks (ranked)

| Risk                                                                                                                                      | Severity | Notes / mitigation                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value prop vs. existing free pickup networks.** CTT, Payshop, DPD Pickup, InPost, Mondial Relay and lockers already exist in Portugal.  | Critical | The pitch has to be about coverage, opening hours or flexibility those networks lack. Validate this in the Month 1 interviews. It's not a software problem.                              |
| **Reshipping fraud / package-mule schemes.** P2P receiving is the textbook vector (stolen cards shipping goods to a third-party address). | Critical | Phone-verified customers, per-customer reservation caps, declared-value caps, admin review of anomalies, host right to refuse, and an incident path to authorities. Legal review needed. |
| **Carrier/merchant refusal or failed delivery.**                                                                                          | High     | Already acknowledged in the brief. Measure it (`failed_delivery` reports) and don't promise compatibility in the copy.                                                                   |
| **Liability for loss, theft or damage.**                                                                                                  | High     | Custody events + photos give evidence. Insurance and terms need a lawyer before any live transaction.                                                                                    |
| **Host safety and privacy** (strangers learn a home address and show up at the door).                                                     | High     | Shops-first pilot, block/report, pickups only during declared hours, admin suspension.                                                                                                   |
| **Liquidity** (too few hosts in the area means a bad experience).                                                                         | High     | A single-neighborhood pilot with hand-recruited hosts.                                                                                                                                   |
| **Host tax/regulatory status** (category B income, NIF, possibly _atividade aberta_).                                                     | Medium   | Legal input. Don't collect NIF until it's required.                                                                                                                                      |
| **GDPR / CNPD compliance** (DPIA likely warranted: location data, address disclosure).                                                    | Medium   | EU data residency, data minimization, retention jobs, privacy request workflow, processor list.                                                                                          |
| **Support load per parcel** (each incident costs real hours).                                                                             | Medium   | It's a core pilot metric. Build the admin tooling early.                                                                                                                                 |

---

## 5. Technical decisions (proposed, need approval)

| Area                      | Decision                                                                                                                                                                                                                                                                      | Rationale                                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Framework                 | **Next.js (App Router), latest stable at scaffold time, pinned**, TypeScript `strict`                                                                                                                                                                                         | Server Components + Server Actions keep privileged logic server-side                                    |
| Package manager / runtime | pnpm, Node LTS                                                                                                                                                                                                                                                                |                                                                                                         |
| Styling / UI              | **SCSS Modules** (`sass`) + design tokens as CSS custom properties + **Radix UI primitives**                                                                                                                                                                                  | Component-scoped styles. Radix supplies accessible behavior (focus, ARIA), and we write all the styling |
| Backend                   | Supabase (Postgres 15+, Auth, Storage, RLS, `pg_cron`, PostGIS), **EU region** (Frankfurt)                                                                                                                                                                                    | Matches the brief, and the data stays in the EU                                                         |
| Supabase client           | `@supabase/ssr` with cookie-based sessions                                                                                                                                                                                                                                    | Officially supported for the App Router                                                                 |
| **Authorization model**   | **RLS is the primary enforcement layer.** State transitions are **Postgres functions** (`SECURITY DEFINER`, check `auth.uid()` + role + current state, write the custody event in the same transaction). The **service-role key is used only in server-only admin/job code.** | Atomic transitions, one source of truth, so an app-layer bug can't bypass a rule                        |
| Roles                     | `user_roles` table (additive: `customer`, `host`, `admin`), exposed in the JWT through a **Custom Access Token Hook** for routing. Sensitive checks re-query the DB.                                                                                                          | `user_metadata` is user-writable and must never hold roles                                              |
| Validation                | `zod` schemas shared by forms and server actions                                                                                                                                                                                                                              |                                                                                                         |
| i18n                      | `next-intl`, locales `en` (default) and `pt-PT`, cookie-based (no URL prefix)                                                                                                                                                                                                 | The app is mostly authenticated, so SEO from locale URLs isn't needed                                   |
| Maps                      | **MapLibre GL JS + OpenFreeMap tiles + Photon geocoding + browser Geolocation**, Uber-style full-screen map with a bottom sheet (Phase 3)                                                                                                                                     | Free, no API keys, so the public repo has no secrets to leak                                            |
| Notifications             | `notifications` table + Supabase Realtime subscription. No email/SMS                                                                                                                                                                                                          | Realistic live updates at no cost                                                                       |
| Pickup codes              | QR = 32-byte random token. PIN = 6 digits. Both **hashed** (SHA-256 for the token, HMAC for the PIN), 15-min expiry, single use, max 5 attempts per token, verified only against reservations at the verifying host's location                                                | Small search space + attempt cap makes brute force infeasible                                           |
| Files                     | Private Storage buckets + short-lived signed URLs. Paths are namespaced by host/reservation                                                                                                                                                                                   |                                                                                                         |
| Observability             | Sentry with PII scrubbing (`sendDefaultPii: false`, `beforeSend` scrubber). Privacy-friendly analytics (Plausible or PostHog EU, no session recording)                                                                                                                        |                                                                                                         |
| Testing                   | **Vitest** (unit), **pgTAP via `supabase test db`** (RLS + state functions, the most important tests), **Playwright** (e2e for the core flow)                                                                                                                                 |                                                                                                         |
| CI                        | GitHub Actions: typecheck, lint, unit tests, `supabase db reset` + pgTAP, Playwright against local Supabase                                                                                                                                                                   |                                                                                                         |
| Hosting                   | Vercel (EU functions region) + Supabase Cloud EU                                                                                                                                                                                                                              |                                                                                                         |
| PWA                       | Manifest + installability in Phase 6. No offline mutations in the MVP                                                                                                                                                                                                         | Offline custody actions would create sync and dispute problems                                          |

---

## 6. Architecture overview (original backend design, see ADR 0003)

```
┌──────────────── Browser (mobile-first PWA) ────────────────┐
│  Server-rendered pages · minimal client components         │
│  Supabase browser client (anon key, user session) for      │
│  reads that RLS already protects                           │
└──────────────┬─────────────────────────────────────────────┘
               │ HTTPS (cookies)
┌──────────────▼──────────── Next.js (Vercel, EU) ───────────┐
│  middleware/proxy: refresh session, redirect anon users    │
│  /customer /host /admin layouts: server-side requireRole() │
│  Server Actions: zod-validate → call Postgres RPC          │
│  server-only admin client (service role): admin jobs only  │
│  Route handlers: auth callback, health                     │
└──────────────┬─────────────────────────────────────────────┘
               │
┌──────────────▼──────────── Supabase (EU) ──────────────────┐
│  Auth (email OTP, phone OTP, custom access token hook)     │
│  Postgres: RLS on every table · state-transition functions │
│            append-only custody_events / audit_logs         │
│            pg_cron: expiry, unclaimed, retention purges    │
│  Storage: private buckets (parcel-photos, incident-files)  │
└────────────────────────────────────────────────────────────┘
```

### Reservation state machine

```
requested ──accept──▶ accepted ──check-in──▶ awaiting_pickup ──handover──▶ collected
    │                    │                        │
    ├─decline──▶ declined │                        └─(N days)──▶ unclaimed ──admin──▶ closed
    ├─cancel───▶ cancelled◀┤ (customer or host, before any parcel arrives)
    └─(24 h)───▶ expired ◀─┘ (expected date + grace, no parcel)
```

Incidents don't change this state machine. An open incident is a flag (`has_open_incident`) that blocks automated transitions until an admin resolves it. Every transition writes exactly one `custody_events` row in the same transaction.

---

## 7. Database schema (original backend design; now mirrored by `src/mocks/types.ts`)

> **Implemented in Phase 1, Step 3** (`supabase/migrations/`). Where the code and this section differ, the migrations are the source of truth. Deviations from the original draft:
>
> - Host vetting is admin approval only: `verification_method/verified_by/verified_at` became `review_note/reviewed_by/reviewed_at`.
> - No `public_hosts` view: approved rows are readable through RLS, and `public_location` is maintained by a trigger from `host_private_details` (clients can't write it). A view would be a second source of truth.
> - Hosts can't read customer `profiles` rows (they would expose phone numbers). The customer's display name will reach hosts through a reservation RPC.
> - Added the `actor_role` enum (`customer|host|admin|system`), `pickup_tokens.revoked_at`, `reservations.cancel_reason`, and `ledger_entries` sign checks.
> - `notifications` has no email columns (in-app + Realtime only).

All PKs are `uuid` (`gen_random_uuid()`), except `bigint identity` on append-only logs. All tables have `created_at`, and mutable tables also have `updated_at` (trigger-maintained). RLS is **enabled on every table**. Money is stored as `integer` cents, in EUR. Timestamps are `timestamptz`, and hours are interpreted in `Europe/Lisbon`.

### Enums

- `app_role`: `customer | host | admin`
- `host_type`: `individual | business`
- `host_status`: `draft | pending_review | approved | rejected | suspended`
- `reservation_status`: `requested | accepted | declined | cancelled | expired | awaiting_pickup | collected | unclaimed | closed`
- `parcel_status`: `received | collected | unclaimed | returned | lost | damaged`
- `parcel_size`: `small | medium | large` (dimensions defined in copy)
- `custody_event_type`: `reservation_requested | reservation_accepted | reservation_declined | reservation_cancelled | reservation_expired | address_viewed | parcel_checked_in | parcel_refused | pickup_code_issued | pickup_code_failed | parcel_handed_over | parcel_unclaimed | incident_opened | incident_resolved | admin_override`
- `incident_type`: `unknown_parcel | damaged | missing | wrong_parcel | failed_delivery | no_show | safety | other`
- `incident_status`: `open | investigating | resolved | dismissed`
- `ledger_entry_type`: `earning | adjustment | payout`

### Tables

| Table                  | Key columns                                                                                                                                                                                                                                                                                                                                                                     | RLS summary                                                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`             | `id` (= `auth.users.id`), `full_name`, `phone_e164`, `phone_verified_at`, `locale`, `deleted_at`                                                                                                                                                                                                                                                                                | Self read/update (limited columns). Admin read. A host sees a customer's `full_name` only through an active reservation (via a view/RPC)                                            |
| `user_roles`           | `user_id`, `role`, `granted_by`, `granted_at`, PK(`user_id`,`role`)                                                                                                                                                                                                                                                                                                             | Self read. Writes only via admin RPC                                                                                                                                                |
| `host_profiles`        | `id`, `user_id` (unique), `host_type`, `status`, `display_name`, `business_name`, `area_label`, `public_location geography(Point)` (snapped), `rules_text`, `max_parcel_size`, `max_declared_value_cents`, `max_concurrent_parcels`, `is_paused`, `verification_method`, `verified_by`, `verified_at`, `terms_version`, `terms_accepted_at`                                     | Anyone authenticated reads **approved, non-suspended** rows through the `public_hosts` view (safe columns only). Owner reads/updates own row (not `status`/verification). Admin all |
| `host_private_details` | `host_id` PK, `address_line1`, `address_line2`, `postal_code`, `city`, `exact_location geography(Point)`, `access_instructions`                                                                                                                                                                                                                                                 | Owner + admin only. Customers get the address **only** via `get_reservation_address(reservation_id)`, which checks status ∈ {accepted, awaiting_pickup} and logs `address_viewed`   |
| `host_weekly_hours`    | `id`, `host_id`, `weekday` (0–6), `opens_at`, `closes_at`                                                                                                                                                                                                                                                                                                                       | Public read for approved hosts. Owner write                                                                                                                                         |
| `host_time_off`        | `id`, `host_id`, `starts_at`, `ends_at`, `reason`                                                                                                                                                                                                                                                                                                                               | Owner + admin. Customers see only the computed availability                                                                                                                         |
| `reservations`         | `id`, `reference_code` (unique, `VZ-` + 6 chars from an unambiguous alphabet), `customer_id`, `host_id`, `status`, `expected_delivery_date`, `merchant_name?`, `carrier_name?` (free text), `tracking_number?`, `declared_size`, `declared_value_cents`, `customer_note?`, `decline_reason?`, `responded_at`, `expires_at`, `has_open_incident`, `prohibited_items_attested_at` | Customer: own rows. Host: rows for their host profile. Admin: all. **No direct UPDATE grants**: all transitions go through RPCs                                                     |
| `parcels`              | `id`, `reservation_id`, `status`, `size`, `photo_path?`, `received_at`, `received_by`, `collected_at`, `handover_by`                                                                                                                                                                                                                                                            | Customer and host of the parent reservation read. Writes via RPC                                                                                                                    |
| `pickup_tokens`        | `id`, `reservation_id`, `token_hash`, `pin_hash`, `expires_at`, `used_at`, `failed_attempts`, partial unique index on one active token per reservation                                                                                                                                                                                                                          | **No client access at all.** Only RPCs `issue_pickup_code` / `verify_pickup_code`                                                                                                   |
| `custody_events`       | `id bigint`, `reservation_id`, `parcel_id?`, `event_type`, `actor_id`, `actor_role`, `occurred_at`, `metadata jsonb`                                                                                                                                                                                                                                                            | Read by the reservation's customer/host + admin. **INSERT only from SECURITY DEFINER functions. UPDATE/DELETE revoked from everyone + blocking trigger**                            |
| `incidents`            | `id`, `reservation_id?`, `parcel_id?`, `host_id?`, `reported_by`, `type`, `status`, `description`, `resolution?`, `assigned_to?`, `resolved_at`                                                                                                                                                                                                                                 | Reporter + involved host/customer read. Admin all                                                                                                                                   |
| `incident_attachments` | `id`, `incident_id`, `storage_path`, `uploaded_by`                                                                                                                                                                                                                                                                                                                              | Same as the parent incident                                                                                                                                                         |
| `ledger_entries`       | `id`, `host_id`, `reservation_id?`, `entry_type`, `amount_cents`, `note`, `created_by`, `created_at`                                                                                                                                                                                                                                                                            | Host reads own. Admin writes. Append-only (corrections = `adjustment` rows)                                                                                                         |
| `notifications`        | `id`, `user_id`, `type`, `payload jsonb`, `read_at`, `email_status`, `email_sent_at`                                                                                                                                                                                                                                                                                            | Recipient reads/marks read. Inserted by RPCs/triggers                                                                                                                               |
| `audit_logs`           | `id bigint`, `actor_id`, `action`, `target_table`, `target_id`, `details jsonb`, `created_at`                                                                                                                                                                                                                                                                                   | Admin read only. Append-only                                                                                                                                                        |
| `privacy_requests`     | `id`, `user_id`, `type` (`export`/`deletion`), `status`, `handled_by`, `completed_at`                                                                                                                                                                                                                                                                                           | Self create/read. Admin handle                                                                                                                                                      |
| `legal_acceptances`    | `user_id`, `document` (`terms`/`privacy`/`host_agreement`), `version`, `accepted_at`                                                                                                                                                                                                                                                                                            | Self insert/read. Admin read                                                                                                                                                        |

### Key Postgres functions (RPC)

- `request_reservation(...)`: validates host approved/not paused, date inside hours, size/value caps, capacity, customer phone verified, and customer active-reservation cap
- `respond_to_reservation(id, accept bool, reason?)`: host only, from `requested`
- `cancel_reservation(id, reason)`: customer or host, before check-in
- `get_reservation_address(id)`: customer only, logs `address_viewed`
- `check_in_parcel(reference_code, size, photo_path?)`: host only, reservation must be theirs and `accepted`/`awaiting_pickup`
- `issue_pickup_code(reservation_id)` → `{token, pin, expires_at}`: plaintext returned once, only hashes stored
- `verify_pickup_code(reservation_id | token, pin?)` → handover: host only, attempt counting, single-use
- `report_incident(...)`, `admin_resolve_incident(...)`, `admin_set_host_status(...)`, `admin_grant_role(...)`: admin ones check `has_role('admin')` and write `audit_logs`
- `pg_cron` jobs: expire unanswered requests, expire undelivered reservations, mark unclaimed parcels, purge photos past retention

### Helper

- `public.has_role(role app_role) returns boolean`: `SECURITY DEFINER`, `STABLE`, used inside RLS policies.

---

## 8. Folder structure

```
vizinho/
├── CLAUDE.md
├── README.md                     # local setup
├── .env.example
├── docs/
│   ├── VIZINHO_PROJECT_BRIEF.md
│   ├── DEVELOPMENT_PLAN.md
│   └── adr/                      # one file per architecture decision
├── supabase/
│   ├── config.toml
│   ├── migrations/               # timestamped SQL, never edited after merge
│   ├── seed.sql                  # MOCK hosts/customers/parcels only
│   └── tests/                    # pgTAP: RLS + RPC tests
├── src/
│   ├── app/
│   │   ├── (marketing)/          # landing, legal pages
│   │   ├── (auth)/               # login, verify-otp, verify-phone, auth/callback
│   │   ├── customer/             # layout = requireRole('customer')
│   │   ├── host/                 # layout = requireRole('host'); onboarding is open to any customer
│   │   ├── admin/                # layout = requireRole('admin')
│   │   └── api/health/
│   ├── features/                 # domain modules: actions.ts, queries.ts, schemas.ts, components/
│   │   ├── auth/  hosts/  reservations/  parcels/  pickup/  incidents/  ledger/  admin/
│   ├── components/
│   │   ├── ui/                   # Button/, Input/, Dialog/... each = Component.tsx + Component.module.scss + index.ts
│   │   ├── map/                  # MapView, HostMarker, BottomSheet, LocateMeButton
│   │   └── layout/               # app shells, nav, role switcher
│   ├── styles/                   # _tokens.scss, _mixins.scss, _breakpoints.scss, globals.scss, themes
│   ├── lib/
│   │   ├── supabase/             # server.ts, browser.ts, middleware.ts, admin.ts ('server-only')
│   │   ├── auth/                 # getSession, requireRole
│   │   ├── env.ts                # zod-validated env
│   │   └── utils/
│   ├── i18n/                     # next-intl config
│   ├── messages/                 # pt-PT.json, en.json
│   └── types/database.ts         # generated by `supabase gen types`
├── tests/
│   ├── unit/
│   └── e2e/                      # Playwright
├── middleware.ts                 # or proxy.ts, depending on the Next.js version
└── .github/workflows/ci.yml
```

---

## 9. Phased milestones

Each phase ends with a demo, green CI, and an update to this plan.

### Phase 1: Foundation _(the first build after approval)_

1. Scaffold Next.js + TS strict + SCSS Modules + design tokens + base UI kit (Button, Input, Field, Card, Dialog, Toast) + ESLint/Prettier/Stylelint + Vitest + Playwright.
2. Supabase local (`supabase init`), EU project settings documented.
3. Env handling (`env.ts`, `.env.example`), `server-only` admin client.
4. **Full schema migration** (all tables, enums, indexes, RLS policies, `has_role`, append-only triggers). RPC _bodies_ only for auth/roles in this phase. The rest are stubs.
5. Auth: email + password sign-up/sign-in, profile auto-creation trigger, custom access token hook (roles → JWT), sign-out, **one-click demo logins**.
6. Role-gated shells: `/customer`, `/host`, `/admin` with `requireRole`, a role switcher, mobile nav, i18n (en/pt-PT), light/dark theme.
7. Seed: demo customer, host, and admin accounts, plus ~20 mock hosts across Lisbon neighborhoods.
8. pgTAP tests proving cross-user/cross-role isolation on every table. A Playwright smoke test per role.
9. CI pipeline, README setup instructions, first ADRs.

**Done when:** each seeded role can log in, lands on its dashboard, cannot reach other roles' routes or rows, and all tests pass in CI.

> **Done 2026-11-05.** Seed: 21 hosts across Lisbon (18 approved, 2 awaiting review, 1 suspended), 3 extra customers, and 8 reservations covering the main statuses, each with a matching custody trail. Tests: 88 pgTAP assertions (including seed integrity), 60 unit tests, 24 Playwright tests (`tests/e2e`). GitHub Actions runs all of them plus a production build on every push and PR (`.github/workflows/ci.yml`).

### Phase 2: Hosts and admin approval

Host application (rules, caps, hours, time off, pause; address picked on a map), admin approval queue, location snapping, `public_hosts` view, audit logging of admin actions.

Location snapping already exists (Phase 1 trigger), and the `public_hosts` view was dropped in favour of RLS (§7). Steps:

1. **Rules** ✅ (first as Postgres RPCs, now `src/features/hosting/service.ts`): `submitApplication` (draft/rejected → pending_review; checks the area, address and hours exist; records the host agreement; audits; notifies admins) and `reviewHost(adminId, hostId, decision, note)` (approve/reject/suspend/reinstate with fixed source states; a note is required to reject or suspend; approval grants the `host` role and suspension keeps it; admins can't review their own listing; audits; notifies the host). An application is locked while in review. Pausing stays a plain owner setting.
2. **"Become a host" form** ✅ in the customer area: type and name, rules and limits, opening hours, agreement, with a live checklist. The location section waits for Step 3.
3. **Location picker** ✅: MapLibre + OpenFreeMap with an Uber-style fixed centre pin, Photon address search (accessible combobox), "use my current location", and a shaded preview of the grid cell customers see. Saving stores the exact point privately and publishes only the snapped pin. Phase 3's discovery map reuses `LocationMap`.
4. **Admin approval queue** ✅: `/admin/hosts` lists hosts by status (waiting applications oldest first, with counts); `/admin/hosts/review?host=<id>` shows the listing, owner, hours and history, reveals the private address and exact map pin only on request (each view audited), and offers only the decisions valid from the current state (a note is required to reject or suspend; admins can't decide on their own listing).
5. **Host settings** ✅: `/host/listing` (edit the live listing and location; no move while the host has accepted reservations or parcels in storage; moves are audited with the public points only) and `/host/schedule` (pause new requests, weekly hours, time off). Time off is whole Lisbon days, up to 60 days, starting today to a year ahead, at most 10 upcoming, no overlaps, and not on a day a requested or accepted parcel is due. Pause and time off need an approved listing; a suspended listing is read-only.

> **Done 2026-11-10.** Tests: 133 unit, 34 Playwright.

### Phase 3: Discovery and reservations

Uber-style map discovery (geolocation, address search, approximate host markers, bottom-sheet details) with an accessible list-view alternative, host detail page, reservation request with attestation, host accept/decline, address reveal + copy instructions, cancellation, expiry (checked when data is read, since there are no background jobs), in-app notifications. Two-person flows are demonstrated by switching accounts in the same browser.

### Phase 4: Custody

Parcel check-in by reference code with a photo (kept in the browser), unknown-parcel → incident, storage list, pickup code (QR + PIN) issue/verify, handover, unclaimed job, customer status timeline.

### Phase 5: Operations

Incident workflow (both sides + admin queue), audit trail viewer, manual ledger, privacy export/deletion (download your data as JSON), metrics dashboard, account suspension.

### Phase 6: Pilot hardening

Accessibility audit (WCAG 2.2 AA, axe in CI), PWA manifest, legal pages, Content-Security-Policy, performance budget. (The live demo is already deployed to GitHub Pages since 2026-11-12, ADR 0004.)

Mapping to the brief's months: Phases 1–3 cover Month 2, and Phases 4–6 cover the start of Month 3, before the closed pilot.

---

## 10. Prioritized backlog (top of each phase)

**Must (pilot blockers):** auth + roles + RLS · host approval · reservation request/accept · address reveal with logging · check-in · pickup code + handover · custody log · incident reporting · admin audit view · email notifications · pt-PT copy.
**Should:** map view · time off/pause · ledger · metrics dashboard · privacy request workflow · English.
**Could:** PWA install · photo blurring guidance · host ratings · customer blocking by host.
**Won't (MVP):** payments/PSP · carrier/merchant integrations or tracking · native apps · SMS/email/push notifications · phone/ID verification · proxy pickup · offline mode.

---

## 11. Original questions (resolved in §0, kept for history)

1. **Pilot host mix:** shops-first, neighbors-first, or both? _(I recommend shops-first because it largely removes the residential-address and availability risks.)_
2. **Pilot location:** which city/neighborhood?
3. **Auth:** OK with email OTP code (no passwords) + phone OTP before the first reservation?
4. **SMS provider budget:** Twilio acceptable for phone OTP?
5. **Defaults M1–M3:** 7-day storage, 24 h response window, 5-day late-delivery grace, multi-parcel reservations: OK?
6. **Languages:** pt-PT + English from day 1?
7. **Host verification:** manual review with **no ID document storage**: OK?
8. **Hosting:** Vercel + Supabase Cloud (Frankfurt): OK, and do you already have accounts?
9. **`docs/conversation.md`:** does it exist somewhere? It may contain decisions I haven't seen.
