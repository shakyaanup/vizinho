import { test as base, expect, type Locator, type Page } from "@playwright/test";

export { expect };

/**
 * `test` with one extra, automatic check: any browser console error or
 * uncaught exception on the page fails the test. Hydration mismatches and
 * React runtime errors show up there, not in assertions. A test that expects
 * a specific error (e.g. a 404 page) declares it with `consoleErrors.allow()`.
 */
/** What the fake Photon geocoder returns for any search (one Arroios address). */
export const PHOTON_RESULT = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-9.1361503, 38.7278371] },
      properties: {
        osm_type: "N",
        osm_id: 3996071872,
        housenumber: "42A",
        street: "Rua de Arroios",
        district: "Arroios",
        city: "Lisboa",
        postcode: "1150-055",
        countrycode: "PT",
      },
    },
  ],
};

// A map style with no tiles: the map renders a plain background, offline.
const BLANK_MAP_STYLE = {
  version: 8,
  sources: {},
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#e7e5e4" } },
  ],
};

export const test = base.extend<{
  consoleErrors: { allow: (pattern: RegExp) => void };
  fakeExternalServices: void;
}>({
  // Tests never call the internet: map tiles and address search are faked,
  // so a slow or down third-party service can't make the suite flaky.
  fakeExternalServices: [
    async ({ page }, use) => {
      await page.route("https://tiles.openfreemap.org/**", (route) =>
        route.fulfill({ json: BLANK_MAP_STYLE }),
      );
      await page.route("https://photon.komoot.io/**", (route) =>
        route.fulfill({ json: PHOTON_RESULT }),
      );
      await use();
    },
    { auto: true },
  ],
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      const allowed: RegExp[] = [/favicon/];
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(`${page.url()} :: ${message.text()}`);
      });
      page.on("pageerror", (error) => errors.push(`pageerror :: ${error.message}`));
      await use({ allow: (pattern) => allowed.push(pattern) });
      const unexpected = errors.filter((e) => !allowed.some((p) => p.test(e)));
      expect(unexpected, "browser console errors").toEqual([]);
    },
    { auto: true },
  ],
});

/**
 * Only visible matches. During a same-route navigation Next.js can briefly
 * keep the streamed server copy in a hidden node while React mounts a new one.
 */
export const visible = (locator: Locator) => locator.filter({ visible: true });

export const heading = (page: Page) => visible(page.getByRole("heading", { level: 1 }));

/** A unique address, so sign-ups never collide. */
export const uniqueEmail = (name: string) =>
  `${name}+${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`;

/** One-click demo login from the landing page. */
export async function demoLogin(page: Page, role: "customer" | "host" | "admin") {
  await page.goto("/");
  await page.getByRole("button", { name: new RegExp(`Try as ${role}`) }).click();
  await page.waitForURL(`/${role}`);
  await heading(page).waitFor();
}

export async function openAccountMenu(page: Page, name = "Account menu") {
  await page.getByRole("button", { name }).click();
  await page.getByRole("menu").waitFor();
}

/** The phone tab bar or desktop sidebar, whichever is showing. */
export const mainNav = (page: Page) =>
  visible(page.locator("nav[aria-label='Main navigation']"));

/**
 * Signs up a brand-new customer (signed in straight away in the demo).
 * Each test's browser context starts with a fresh copy of the mock data.
 */
export async function signUp(page: Page, fullName: string) {
  const email = uniqueEmail(fullName.split(" ")[0]!.toLowerCase());
  await page.goto("/signup");
  await visible(page.getByLabel("Full name")).fill(fullName);
  await visible(page.getByLabel("Email")).fill(email);
  await visible(page.getByLabel("Password", { exact: true })).fill("Lisboa2026");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("/customer");
  return email;
}
