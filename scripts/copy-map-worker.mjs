// MapLibre 6 parses map tiles in a Web Worker loaded from its own file, which
// Next.js doesn't bundle. Copy it into public/ (versioned, git-ignored) so the
// map can point at it with setWorkerUrl(). Runs before `dev` and `build`.
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const pkgPath = require.resolve("maplibre-gl/package.json");
const { version } = JSON.parse(readFileSync(pkgPath, "utf8"));

const outDir = path.join(process.cwd(), "public", "maplibre");
mkdirSync(outDir, { recursive: true });
copyFileSync(
  path.join(path.dirname(pkgPath), "dist", "maplibre-gl-worker.mjs"),
  path.join(outDir, `maplibre-gl-worker-${version}.js`),
);
