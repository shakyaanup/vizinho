import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Baseline security headers for every route. A Content-Security-Policy is
// added in Phase 6, once every external origin (map tiles, Supabase) is known.
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

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  sassOptions: {
    // Lets any .scss file write `@use "styles/tokens" as *;`
    loadPaths: [path.join(process.cwd(), "src")],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
