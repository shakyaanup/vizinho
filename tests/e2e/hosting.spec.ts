import { demoLogin, expect, signUp, test, visible } from "./fixtures";

test.describe("become a host", () => {
  test("a new customer drafts a host application", async ({ page }) => {
    await signUp(page, "Marta Ribeiro");

    // Entry point on the customer dashboard.
    await page.goto("/customer");
    await visible(page.getByRole("link", { name: "Become a host" })).click();
    await expect(page).toHaveURL("/customer/become-a-host");

    // Nothing saved yet: hours wait for the listing, and there is no submit.
    await expect(visible(page.getByText("Save your listing first."))).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit for review" })).toHaveCount(0);

    // A business needs a business name.
    const listing = page.locator("section", {
      has: page.getByRole("heading", { name: "Your listing" }),
    });
    await listing.getByLabel("You're hosting as").selectOption("business");
    await listing.getByLabel("Listing name").fill("Florista da Graça");
    await listing.getByRole("button", { name: "Save listing" }).click();
    await expect(
      listing.getByText("Enter your business name (2–120 characters)."),
    ).toBeVisible();
    // The typed name survives the failed save.
    await expect(listing.getByLabel("Listing name")).toHaveValue("Florista da Graça");

    await listing.getByLabel("Business name").fill("Florista da Graça Lda");
    await listing.getByLabel("Highest declared value (€)").fill("150");
    await listing.getByLabel("Parcels at the same time").fill("8");
    await listing.getByRole("button", { name: "Save listing" }).click();
    await expect(listing.getByText("Listing saved.")).toBeVisible();

    // Opening hours: a window that closes before it opens is refused.
    const hours = page.locator("section", {
      has: page.getByRole("heading", { name: "Opening hours" }),
    });
    await hours.getByLabel("Open on Monday").check();
    await hours.getByLabel("Open on Tuesday").check();
    await hours.getByLabel("Opening time on Tuesday").fill("12:00");
    await hours.getByLabel("Closing time on Tuesday").fill("09:00");
    await hours.getByRole("button", { name: "Save opening hours" }).click();
    await expect(
      hours.getByText("Closing time must be after opening time."),
    ).toBeVisible();
    await expect(hours.getByLabel("Closing time on Tuesday")).toHaveAttribute(
      "aria-invalid",
      "true",
    );

    await hours.getByLabel("Closing time on Tuesday").fill("15:00");
    await hours.getByRole("button", { name: "Save opening hours" }).click();
    await expect(hours.getByText("Opening hours saved.")).toBeVisible();

    // Two of three steps done; location arrives in the next step, so submit stays off.
    const checklist = page.getByRole("list", { name: "Application checklist" });
    await expect(checklist.getByRole("listitem")).toHaveText([
      /Your listing\s*Done/,
      /Opening hours\s*Done/,
      /Location\s*To do/,
    ]);
    await expect(page.getByRole("button", { name: "Submit for review" })).toBeDisabled();

    // Everything was saved to the database.
    await page.reload();
    await expect(visible(page.getByLabel("Listing name"))).toHaveValue(
      "Florista da Graça",
    );
    await expect(visible(page.getByLabel("Business name"))).toHaveValue(
      "Florista da Graça Lda",
    );
    await expect(visible(page.getByLabel("Closing time on Tuesday"))).toHaveValue(
      "15:00",
    );
    await expect(visible(page.getByLabel("Open on Wednesday"))).not.toBeChecked();
  });

  test("hosts don't see the invitation to become one", async ({ page }) => {
    await demoLogin(page, "host");
    await page.goto("/customer");
    await expect(
      visible(page.getByRole("heading", { name: "Hello, Hugo" })),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Become a host" })).toHaveCount(0);
  });
});
