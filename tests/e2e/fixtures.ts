import { test as base, expect, type Locator, type Page } from "@playwright/test";

export { expect };

/**
 * `test` with one extra, automatic check: any browser console error or
 * uncaught exception on the page fails the test. Hydration mismatches and
 * React runtime errors show up there, not in assertions. A test that expects
 * a specific error (e.g. a 404 page) declares it with `consoleErrors.allow()`.
 */
export const test = base.extend<{ consoleErrors: { allow: (pattern: RegExp) => void } }>({
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
