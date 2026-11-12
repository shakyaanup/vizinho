import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Baseline security headers for every route. A Content-Security-Policy is
// added in Phase 6, once every external origin (map tiles, geocoder) is known.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Geolocation is needed by the map (same origin only); everything else is off.
  {
    key: "Permissions-Policy",
    value: "geolocation=(self), camera=(self), microphone=(), payment=()",
  },
];

/**
 * GitHub Pages build (scripts/build-pages.mjs): plain static files under the
 * repository's path, e.g. /vizinho. There is no server there, so no proxy
 * (language routing) and no response headers; the script lays out the
 * locales as folders instead.
 */
const staticExport = process.env.STATIC_EXPORT === "1";
const basePath = staticExport ? (process.env.PAGES_BASE_PATH ?? "") : "";

const nextConfig: NextConfig = {
  ...(staticExport && { output: "export", trailingSlash: true }),
  basePath,
  env: {
    // Public files that aren't loaded through Next.js (the map worker) need it.
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  // Partial prerendering needs a server; a static export renders every page
  // in full at build time instead.
  ...(staticExport && { experimental: { cpus: 2 } }),
  cacheComponents: !staticExport,
  partialPrefetching: !staticExport,
  poweredByHeader: false,
  sassOptions: {
    // Lets any .scss file write `@use "styles/tokens" as *;`
    loadPaths: [path.join(process.cwd(), "src")],
  },
  ...(!staticExport && {
    async headers() {
      return [{ source: "/:path*", headers: securityHeaders }];
    },
  }),
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
