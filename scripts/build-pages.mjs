// Builds the demo as static files for GitHub Pages (out/).
//
//   PAGES_BASE_PATH=/vizinho node scripts/build-pages.mjs
//
// The normal build uses src/proxy.ts for language routing: "/" is English and
// "/pt" is Portuguese, rewritten to the [locale] segment ("en", "pt-PT"). A
// static host has no proxy, so this script:
//   1. sets the proxy aside (static export refuses to build with one),
//   2. exports every page for both locales (out/en/…, out/pt-PT/…),
//   3. moves them to the URLs the app links to: out/… and out/pt/….
// Everything else (data, sign-in, the map) already runs in the browser.

import { execSync } from "node:child_process";
import { cpSync, existsSync, renameSync, rmSync, writeFileSync } from "node:fs";

const PROXY = "src/proxy.ts";
const PROXY_ASIDE = "src/proxy.ts.pages-build";
const OUT = "out";

const run = (command) =>
  execSync(command, {
    stdio: "inherit",
    env: { ...process.env, STATIC_EXPORT: "1" },
  });

rmSync(OUT, { recursive: true, force: true });
renameSync(PROXY, PROXY_ASIDE);
try {
  run("node scripts/copy-map-worker.mjs");
  run("next build");
} finally {
  renameSync(PROXY_ASIDE, PROXY);
}

// English at the root, Portuguese under /pt (LOCALE_URL_PREFIXES).
const moves = [
  ["en", "."],
  ["pt-PT", "pt"],
];
for (const [from, to] of moves) {
  const source = `${OUT}/${from}`;
  if (!existsSync(source)) throw new Error(`Missing export folder ${source}`);
  cpSync(source, `${OUT}/${to}`, { recursive: true });
  rmSync(source, { recursive: true });
}

// Unknown paths: GitHub Pages serves 404.html. Use the localized not-found
// page the catch-all route exported.
if (existsSync(`${OUT}/404/index.html`)) {
  cpSync(`${OUT}/404/index.html`, `${OUT}/404.html`);
}

// Serve folders starting with "_" (like _next) as they are.
writeFileSync(`${OUT}/.nojekyll`, "");
process.stdout.write("Static demo ready in out/\n");
