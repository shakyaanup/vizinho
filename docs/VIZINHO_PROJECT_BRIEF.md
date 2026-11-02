# Vizinho — MVP Project Brief

## Product

A Portugal-first peer-to-peer parcel receiving marketplace. Verified hosts (neighbors or participating shops) can accept packages on behalf of customers, who collect them using a one-time pickup code.

## Critical assumptions to validate before live transactions

- Retailers and carriers may restrict delivery to third-party residential addresses; do not claim universal Amazon or courier compatibility.
- A printed alias/code does not guarantee carrier acceptance or successful delivery.
- Hosts need explicit opt-in for each reservation, capacity and availability controls, and a safe refusal process.
- Determine legal liability for lost, stolen, damaged, illegal or uncollected parcels, consumer rights, host taxation, insurance and GDPR compliance in Portugal.
- No courier tracking without a legitimate integration or customer-provided tracking information.
- Pricing, market size, margins and fundraising figures discussed previously are hypotheses, not validated facts.

## MVP roles

Customer, Host, Admin.

## Customer MVP

- Email login and verified phone number
- Search host pickup points by approximate area and opening hours; conceal exact residential address until a host accepts a booking
- View host rules, capacity, allowed parcel size/value and availability
- Create parcel reservation with expected delivery date and optional merchant/tracking info
- Receive a unique reservation reference and copyable address instructions after host acceptance
- View manually updated parcel statuses and notifications
- Collect parcel with short-lived pickup PIN/QR
- Report problems and view pickup history

## Host MVP

- Apply, complete verification via approved provider or manual pilot review, agree to terms
- Set available hours, capacity, parcel restrictions and payout details
- Approve or decline each reservation before address is revealed
- Record parcel arrival with reservation reference, timestamp and photo of package exterior (avoid collecting unnecessary label personal data)
- Verify pickup PIN and confirm handover
- Manage incidents and temporarily pause availability

## Admin MVP

- Review and approve hosts, moderate incidents, handle mismatched/unknown parcels, audit custody events
- See reservation lifecycle, operational metrics and manual payout ledger
- Suspend accounts and handle deletion/privacy requests

## Core flow

1. Customer chooses a host using approximate location.
2. Customer requests a reservation; host accepts.
3. Platform generates unique, expiring reservation reference and displays address instructions.
4. Customer independently enters the authorized address at merchant checkout, subject to merchant/carrier acceptance.
5. Host checks package label against an active reservation before accepting; unknown parcels are declined or handled by incident workflow.
6. Host checks in parcel; customer notified.
7. Customer shows short-lived pickup code; host verifies and records handover.
8. Admin can review event audit trail and resolve disputes.

## Proposed tech stack

- Next.js + TypeScript + Tailwind CSS responsive PWA for customer, host and admin interfaces; do not build native apps before pilot validation.
- Supabase Auth + PostgreSQL + Row Level Security + Storage for pilot backend.
- Server-side API routes/server actions for privileged operations; never expose service-role credentials to clients.
- Mapbox or Google Maps with approximate host pins before approval.
- Email notifications first; SMS and push notifications later.
- Stripe or a Portuguese-compatible PSP only after legal and marketplace payout requirements are established; manual pilot accounting first.
- Sentry and basic analytics with privacy safeguards.

## Suggested data model

users, host_profiles, host_availability, reservations, parcels, custody_events, pickup_tokens, incidents, payouts, audit_logs. Each record uses UUID primary keys; reservations reference customer and host; parcel codes are per-reservation rather than permanent user identifiers. Token secrets must be hashed, expire, and be single-use. RLS isolates user/host records; admin operations require server-side authorization.

## UX screens

Customer: onboarding, host discovery, host details, reservation request, approved address/copy instructions, package status, pickup code, history, help.
Host: onboarding/verification, dashboard, reservation approvals, intake, storage list, handover, schedule/capacity, earnings, incidents.
Admin: overview, host approvals, reservations, incident queue, audit trail, payouts.

## Six-month milestones

Month 1: interview customers, hosts, carriers, retailers; legal feasibility and concierge pilot with manual workflows.
Month 2: responsive PWA, auth, host onboarding, reservations, admin review.
Month 3: closed pilot in one neighborhood; custody logging and pickup confirmation.
Month 4: improve reliability, controls, retention; expand only if metrics support it.
Month 5: test willingness to pay and host compensation; evaluate payment rails.
Month 6: decide to iterate, scale to another city, or stop based on measured unit economics.

## Pilot metrics

Accepted reservations, successfully received parcels, handover success, host availability, repeat customer usage, lost/damaged parcels, support time per parcel, contribution margin per parcel, customer acquisition cost. Track failed checkout/address attempts separately.

## Claude Code implementation instructions

1. Read this brief and docs/conversation.md if present.
2. Identify contradictions and unvalidated assumptions before implementation.
3. Propose a lean technical architecture, ERD, phased implementation plan and prioritized backlog.
4. Implement Phase 1 only after presenting the plan: Next.js app shell, auth, role-based dashboards and database schema with RLS.
5. Use mocked packages and hosts until live delivery/address/legal assumptions are validated.
6. Include tests, migrations, environment example and local setup instructions.
7. Never invent integration with Amazon, CTT, DHL or other carriers.
