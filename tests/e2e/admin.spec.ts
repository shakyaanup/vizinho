import {
  demoLogin,
  expect,
  logOutFromMenu,
  saveLocationBySearch,
  section,
  startHostApplication,
  test,
  visible,
} from "./fixtures";

test.describe("admin host review (desktop)", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("queue, private address on demand, and decisions with rules", async ({ page }) => {
    await demoLogin(page, "admin");
    await page.getByRole("link", { name: "Review hosts" }).click();
    await expect(page).toHaveURL("/admin/hosts");

    // Waiting applications are shown first, oldest first, with counts.
    const inReview = page.getByRole("button", { name: /In review/ });
    await expect(inReview).toHaveAttribute("aria-pressed", "true");
    await expect(inReview).toContainText("2");
    const rows = page.getByRole("main").getByRole("listitem");
    await expect(rows).toHaveText([/Sapataria dos Anjos/, /Mariana in Marvila/]);

    await page.getByRole("button", { name: /Approved/ }).click();
    await expect(rows).toHaveCount(18);
    await page.getByRole("button", { name: /In review/ }).click();

    await page.getByRole("link", { name: /Mariana in Marvila/ }).click();
    await expect(visible(page.getByRole("heading", { level: 1 }))).toHaveText(
      "Mariana in Marvila",
    );

    // The private address is hidden until asked for, and the view is audited.
    const privateCard = section(page, "Private address");
    await expect(page.getByText("Rua do Açúcar 40")).toHaveCount(0);
    await privateCard.getByRole("button", { name: "Show private address" }).click();
    await expect(privateCard.getByText("Rua do Açúcar 40")).toBeVisible();
    // Focus follows the reveal, so keyboard users continue from the address.
    await expect(privateCard.locator("address")).toBeFocused();
    await expect(
      privateCard.getByRole("region", { name: "Map of the host's location" }),
    ).toBeVisible();
    const history = section(page, "History");
    await expect(history).toContainText("Private address viewed, by Ana Admin");

    // A rejection needs a reason the applicant can read.
    const decision = section(page, "Decision");
    await decision.getByRole("button", { name: "Reject" }).click();
    await expect(decision.getByText("Add a note explaining the decision.")).toBeVisible();

    await decision.getByRole("button", { name: "Approve" }).click();
    await expect(decision.getByText("Saved. The host is now: Approved.")).toBeVisible();
    await expect(history).toContainText("Approved, by Ana Admin");
    // From "approved", the only possible decision is to suspend.
    await expect(decision.getByRole("button")).toHaveText(["Suspend"]);

    await page.getByRole("link", { name: "All hosts" }).click();
    await expect(page.getByRole("button", { name: /In review/ })).toContainText("1");
  });
});

test("an application goes from customer to approved host", async ({ page }) => {
  // 1. A new customer applies.
  const email = await startHostApplication(page, "Marta in Arroios");
  await saveLocationBySearch(page);
  const submit = section(page, "Review and submit");
  await submit.getByLabel("I agree to the host agreement").check();
  await submit.getByRole("button", { name: "Submit for review" }).click();
  await expect(visible(page.getByText("Your application is in review"))).toBeVisible();
  await logOutFromMenu(page);

  // 2. An admin approves it (same browser, so the same demo data).
  await demoLogin(page, "admin");
  await page.goto("/admin/hosts");
  await page.getByRole("link", { name: /Marta in Arroios/ }).click();
  await expect(section(page, "History")).toContainText(
    "Application submitted, by Marta Ribeiro",
  );
  await section(page, "Decision")
    .getByLabel("Note to the host")
    .fill("Welcome to Vizinho!");
  await section(page, "Decision").getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Saved. The host is now: Approved.")).toBeVisible();
  await logOutFromMenu(page);

  // 3. The applicant logs back in and lands in the host area.
  await page.goto("/login");
  await visible(page.getByLabel("Email")).fill(email);
  await visible(page.getByLabel("Password", { exact: true })).fill("Lisboa2026");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL("/host");
  const listing = page.locator("section").filter({ hasText: "Marta in Arroios" });
  await expect(listing).toContainText("Approved");
  await expect(listing).toContainText("Arroios, Lisboa");
});
