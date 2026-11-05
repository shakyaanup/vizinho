import { test as base, expect, type Locator, type Page } from "@playwright/test";

export { expect };

/** Local Mailpit (catches every email Supabase Auth sends). */
const MAILPIT_API = "http://127.0.0.1:54324/api/v1";

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

/** A fresh, unique address per run so the suite can be re-run without a reset. */
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
 * Waits for an auth email and returns its action link, pointed at the app
 * under test (emails use the configured site URL, :3000).
 */
export async function emailLink(
  page: Page,
  to: string,
  type: "email" | "recovery",
): Promise<{ link: string; html: string }> {
  const pattern = new RegExp(`href="([^"]*type=${type}[^"]*)"`);
  for (let attempt = 0; attempt < 40; attempt++) {
    const search = await fetch(
      `${MAILPIT_API}/search?query=${encodeURIComponent(`to:"${to}"`)}`,
    );
    const { messages = [] } = (await search.json()) as { messages?: { ID: string }[] };
    for (const { ID } of messages) {
      const message = (await (await fetch(`${MAILPIT_API}/message/${ID}`)).json()) as {
        HTML: string;
      };
      const href = message.HTML.match(pattern)?.[1];
      if (href) {
        const url = new URL(href.replaceAll("&amp;", "&"));
        const target = new URL(url.pathname + url.search, page.url());
        return { link: target.toString(), html: message.HTML };
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No "${type}" email arrived for ${to}`);
}
