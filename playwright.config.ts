import { defineConfig, devices } from "@playwright/test";

// The suite runs against a production build on its own port, so it never
// collides with `pnpm dev` on :3000. Every test gets a fresh browser context,
// so it starts from the seed data (src/mocks/seed.ts) and tests can assert on it.
const PORT = 3100;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    // Mobile-first: the default viewport is a phone. Desktop-only tests
    // override it with test.use({ viewport }).
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    // CI builds in an earlier step; locally, build first so the run matches
    // what ships.
    command: isCI
      ? `pnpm start --port ${PORT}`
      : `pnpm build && pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 240_000,
  },
});
