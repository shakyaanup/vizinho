# ADR 0004: Live demo as static files on GitHub Pages

- **Status:** Accepted
- **Date:** 2026-11-12

## Context

Reviewers should be able to try Vizinho without cloning it. Since ADR 0003 everything (data, sign-in, business rules, the map) runs in the browser, so the demo doesn't need a server. GitHub Pages is free, lives next to the code and needs no extra account, but it only serves static files under the repository's path (`/vizinho`).

## Decision

1. **A second build target.** `pnpm build:pages` (`scripts/build-pages.mjs`) builds with `STATIC_EXPORT=1`, which makes `next.config.ts` use `output: "export"`, `trailingSlash`, the `PAGES_BASE_PATH` base path, and no Cache Components (partial prerendering needs a server). The normal `pnpm build` is unchanged and still the one the e2e tests run.
2. **Language routing without the proxy.** A static export can't run `src/proxy.ts`. The script sets it aside, exports both locales (`en`, `pt-PT`) and moves them to the URLs the app already links to: English at the root, Portuguese under `/pt`.
3. **No per-request data in pages.** Every page must be known at build time:
   - The admin review page is `/admin/hosts/review?host=<id>` instead of `/admin/hosts/[id]`, because new applications get random ids. The id is read in the browser, where the data lives.
   - The login form reads `?next=` in the browser (`useSyncExternalStore`), so the page is fully static and still server-renders the form.
   - The catch-all 404 route exports one path, copied to `404.html`.
4. **Deploy after CI.** `.github/workflows/pages.yml` runs when CI succeeds on `main` (or by hand) and publishes `out/` with the official Pages actions.

## Consequences

- The demo is at https://shakyaanup.github.io/vizinho/ and updates on every green push to main.
- Security headers in `next.config.ts` can't be sent by GitHub Pages. That's acceptable for a demo with no real data; a CSP via `<meta>` is a Phase 6 item.
- Two build modes must keep working. New dynamic routes need ids known at build time, or should take their id from a query parameter.
