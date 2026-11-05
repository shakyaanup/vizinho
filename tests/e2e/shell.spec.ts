import type { Page } from "@playwright/test";
import {
  demoLogin,
  expect,
  heading,
  mainNav,
  openAccountMenu,
  test,
  visible,
} from "./fixtures";

/** Reads every StatCard on the page as { label: value }. */
async function stats(page: Page) {
  const pairs = await visible(page.locator("dl")).evaluateAll((lists) =>
    lists
      .filter((dl) => dl.querySelectorAll("dt").length === 1)
      .map((dl) => [
        dl.querySelector("dt")?.textContent,
        dl.querySelector("dd")?.textContent,
      ]),
  );
  return Object.fromEntries(pairs) as Record<string, string>;
}

test.describe("customer area (phone)", () => {
  test.beforeEach(async ({ page }) => demoLogin(page, "customer"));

  test("dashboard shows the seeded reservations", async ({ page }) => {
    await expect(heading(page)).toHaveText("Hello, Carla");
    await expect(mainNav(page).getByRole("link", { name: "Home" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    // Seed: requested + accepted + awaiting pickup.
    expect((await stats(page))["Active reservations"]).toBe("3");
    await expect(visible(page.getByText("No parcels on the way"))).toHaveCount(0);
  });

  test("tabs move aria-current and unbuilt sections show the roadmap", async ({
    page,
  }) => {
    await mainNav(page).getByRole("link", { name: "Find a host" }).click();
    await expect(page).toHaveURL("/customer/hosts");
    await expect(visible(page.getByText("Coming in Phase 3"))).toBeVisible();
    await expect(
      mainNav(page).getByRole("link", { name: "Find a host" }),
    ).toHaveAttribute("aria-current", "page");
    await expect(mainNav(page).getByRole("link", { name: "Home" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  for (const forbidden of ["/admin", "/host/requests"]) {
    test(`opening ${forbidden} redirects to the customer's own area`, async ({
      page,
    }) => {
      await page.goto(forbidden);
      await expect(page).toHaveURL("/customer");
    });
  }

  test("theme choice persists and applies before hydration", async ({ page }) => {
    await openAccountMenu(page);
    await expect(page.getByText("Switch area")).toHaveCount(0); // single role
    await page.getByRole("menuitemradio", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    // Read the attribute as soon as the DOM exists, before React loads, to
    // prove the inline script prevents a light flash.
    await page.reload({ waitUntil: "domcontentloaded" });
    expect(
      await page.evaluate(() => document.documentElement.getAttribute("data-theme")),
    ).toBe("dark");

    await openAccountMenu(page);
    await expect(page.getByRole("menuitemradio", { name: "Dark" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await page.getByRole("menuitemradio", { name: "System" }).click();
    await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  });

  test("language switch keeps the page, log out returns home", async ({ page }) => {
    await openAccountMenu(page);
    await page.getByRole("menuitemradio", { name: "Português" }).click();
    await expect(page).toHaveURL("/pt/customer");
    await expect(heading(page)).toHaveText("Olá, Carla");

    await openAccountMenu(page, "Menu da conta");
    await page.getByRole("menuitem", { name: "Sair" }).click();
    await expect(page).toHaveURL("/pt");
    await page.goto("/pt/customer");
    await expect(page).toHaveURL(/\/pt\/login\?next=%2Fcustomer/);
  });
});

test.describe("host area (phone)", () => {
  test.beforeEach(async ({ page }) => demoLogin(page, "host"));

  test("dashboard shows the listing and seeded activity", async ({ page }) => {
    await expect(heading(page)).toHaveText("Hello, Hugo");
    const listing = visible(
      page.locator("section").filter({ hasText: "Hugo in Arroios" }),
    );
    await expect(listing).toContainText("Approved");
    await expect(listing).toContainText("Arroios, Lisboa");
    await expect(listing).toContainText("Up to 6 parcels at a time");
    await expect(listing).toContainText("6 weekly slots");

    const values = await stats(page);
    expect(values["Requests waiting"]).toBe("1");
    expect(values["Parcels in storage"]).toBe("1");
    await expect(mainNav(page).getByRole("link")).toHaveCount(5);
  });

  test("multi-role users can switch between their areas only", async ({ page }) => {
    await openAccountMenu(page);
    const items = page.getByRole("menuitem");
    await expect(items.filter({ hasText: /^Customer$/ })).toHaveCount(1);
    await expect(items.filter({ hasText: /^Admin$/ })).toHaveCount(0);
    await expect(page.getByRole("menuitem", { name: "Host" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await page.getByRole("menuitem", { name: "Customer" }).click();
    await expect(page).toHaveURL("/customer");
    await expect(heading(page)).toHaveText("Hello, Hugo");
  });

  test("/dashboard and forbidden areas resolve to the host's home", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/host");
    await page.goto("/admin");
    await expect(page).toHaveURL("/host");
  });
});

test.describe("admin area (desktop)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  test.beforeEach(async ({ page }) => demoLogin(page, "admin"));

  test("overview counts come from the database", async ({ page }) => {
    await expect(heading(page)).toHaveText("Overview");
    const values = await stats(page);
    // Accounts grow as the sign-up test runs, so only a lower bound.
    expect(Number(values["Accounts"])).toBeGreaterThanOrEqual(26);
    expect(values["Approved hosts"]).toBe("18");
    expect(values["Hosts awaiting review"]).toBe("2");
    expect(values["Active reservations"]).toBe("5");
    expect(values["Open incidents"]).toBe("1");
  });

  test("desktop uses the sidebar and marks the current section", async ({ page }) => {
    const sidebar = page.locator("aside");
    await expect(sidebar).toBeVisible();
    await sidebar.getByRole("link", { name: "Hosts" }).click();
    await expect(page).toHaveURL("/admin/hosts");
    await expect(sidebar.getByRole("link", { name: "Hosts" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("the account menu works with the keyboard", async ({ page }) => {
    const trigger = page.getByRole("button", { name: "Account menu" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("menu").waitFor();
    await page.keyboard.press("ArrowDown");
    expect(
      await page.evaluate(() => document.activeElement?.getAttribute("role")),
    ).toMatch(/^menuitem/);
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  });

  test("an admin without the host role cannot open /host", async ({ page }) => {
    await page.goto("/host");
    await expect(page).toHaveURL("/admin");
  });
});
