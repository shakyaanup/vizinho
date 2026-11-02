# ADR 0001: Enforce authorization in Postgres (RLS + RPCs), deny by default

- **Status:** Accepted
- **Date:** 2026-11-02

## Context

Vizinho has three roles (customer, host, admin) and data with real privacy stakes: home addresses, parcel custody and pickup codes. The browser talks to Supabase directly for reads, and Next.js server code also queries it. If authorization lived only in application code, any missed check in any route or action would expose data.

## Decision

1. **Postgres is the security boundary.** Row Level Security is enabled on every table, and policies decide which rows each user can see.
2. **Deny by default.** The foundation migration removes Supabase's automatic table grants and Postgres's default `EXECUTE` on new functions. Every capability is granted explicitly, with column-level grants for writable columns.
3. **State changes go through `SECURITY DEFINER` RPCs.** Clients get read-only access to reservations, parcels and custody. Each RPC validates the caller, role and current state, then writes the custody event in the same transaction.
4. **Append-only history.** `custody_events`, `audit_logs` and `ledger_entries` have triggers that block `UPDATE`, `DELETE` and `TRUNCATE` for every role, including the owner and the secret key.
5. **Roles live in `user_roles`.** They're copied into the JWT by a Custom Access Token Hook for fast routing, but sensitive checks re-query `has_role()`.

## Consequences

- An app-layer bug cannot leak or corrupt data that the database refuses to serve.
- The rules are testable in isolation: pgTAP tests act as each role and assert both allowed **and denied** access, and a guard test fails CI if a table lacks RLS or a grant leaks.
- Business logic is split between TypeScript (validation, UX) and SQL (authorization, transitions). Contributors need to be comfortable with SQL.
- Policies must stay cheap. Helpers are wrapped in `(select …)` so they're evaluated once per query, and foreign keys are indexed.
