# ADR 0002: Put the locale in the URL (`/` English, `/pt` Portuguese)

- **Status:** Accepted (supersedes the "cookie-based, no URL prefix" note in the plan)
- **Date:** 2026-11-03

## Context

The plan originally kept the language in a cookie with no URL prefix. Next.js 16 runs with Cache Components: pages are prerendered into a static shell, and anything that reads cookies must stream in behind `<Suspense>`. The root layout needs the locale for `<html lang>`. Reading it from a cookie would make **every page** request-dependent, losing static prerendering everywhere.

## Decision

- The locale is a root route segment: `src/app/[locale]/`. `generateStaticParams` lists `en` and `pt-PT`, so each page prerenders once per language. Components read it via `next/root-params`.
- English is unprefixed (`/login`) and Portuguese uses `/pt` (`/pt/login`), via next-intl `localePrefix: "as-needed"`. The locale tag stays `pt-PT`, so dates and numbers format correctly.
- next-intl's middleware (run inside `src/proxy.ts`) still detects the browser language on first visit and remembers an explicit choice in a cookie.
- Server Actions can't read root params, so forms post the locale in a hidden field. Server Actions return translation _keys_, and the client renders the text.

## Consequences

- Public pages (landing, login, sign-up) are fully static per language, and authenticated pages are partially prerendered.
- URLs are shareable and crawlable per language, and `hreflang` alternates become possible.
- Every internal link must use `Link`, `redirect` and `getPathname` from `@/i18n/navigation` so the prefix is preserved.
