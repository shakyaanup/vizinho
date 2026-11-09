import {
  demoLogin,
  expect,
  section,
  signUp,
  startHostApplication,
  test,
  visible,
} from "./fixtures";

test.describe("become a host", () => {
  test("listing and opening hours are validated and saved", async ({ page }) => {
    await signUp(page, "Marta Ribeiro");

    // Entry point on the customer dashboard.
    await visible(page.getByRole("link", { name: "Become a host" })).click();
    await expect(page).toHaveURL("/customer/become-a-host");

    // Nothing saved yet: later steps wait for the listing, and there is no submit.
    await expect(
      section(page, "Opening hours").getByText("Save your listing first."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit for review" })).toHaveCount(0);

    // A business needs a business name.
    const listing = section(page, "Your listing");
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
    const hours = section(page, "Opening hours");
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

    const checklist = page.getByRole("list", { name: "Application checklist" });
    await expect(checklist.getByRole("listitem")).toHaveText([
      /Your listing\s*Done/,
      /Opening hours\s*Done/,
      /Location\s*To do/,
    ]);
    await expect(page.getByRole("button", { name: "Submit for review" })).toBeDisabled();

    // Everything was saved in the browser's demo store.
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

  test("location by address search, then submit for review", async ({ page }) => {
    await startHostApplication(page);
    const location = section(page, "Location");
    await expect(location.getByRole("region", { name: /Map/ })).toBeVisible();

    // Saving without a pin explains what's missing.
    await location.getByRole("button", { name: "Save location" }).click();
    await expect(
      location.getByText(
        "Place the pin on your door: search for your address or move the map.",
      ),
    ).toBeVisible();

    // Accessible combobox: type, arrow down, Enter.
    const search = location.getByRole("combobox", { name: "Search your address" });
    await search.fill("Rua de Arroios 42");
    const option = location.getByRole("option", {
      name: "Rua de Arroios 42A, 1150-055 Lisboa",
    });
    await expect(option).toBeVisible();
    await expect(location.getByRole("status").first()).toHaveText(/1 address found/);
    await search.press("ArrowDown");
    await expect(option).toHaveAttribute("aria-selected", "true");
    await search.press("Enter");

    // The result fills the address; the user adds the rest.
    await expect(location.getByLabel("Street and number")).toHaveValue(
      "Rua de Arroios 42A",
    );
    await expect(location.getByLabel("Postal code")).toHaveValue("1150-055");
    await expect(location.getByLabel("Neighbourhood")).toHaveValue("Arroios, Lisboa");
    await location.getByLabel("Floor and door (optional)").fill("3º Dto.");
    await location.getByRole("button", { name: "Save location" }).click();
    await expect(location.getByText("Location saved.")).toBeVisible();

    // All steps done: accept the agreement and submit.
    const submit = section(page, "Review and submit");
    await expect(
      submit.getByRole("listitem").filter({ hasText: "Location" }),
    ).toContainText("Done");
    await submit.getByRole("button", { name: "Submit for review" }).click();
    await expect(
      submit.getByText("You need to accept the host agreement."),
    ).toBeVisible();
    await submit.getByLabel("I agree to the host agreement").check();
    await submit.getByRole("button", { name: "Submit for review" }).click();

    // In review: shown as such and locked.
    await expect(visible(page.getByText("Your application is in review"))).toBeVisible();
    await expect(page.getByRole("button", { name: "Save listing" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Save location" })).toHaveCount(0);
    await expect(
      section(page, "Location").getByLabel("Street and number"),
    ).toBeDisabled();
  });

  test.describe("with location access", () => {
    test.use({
      geolocation: { latitude: 38.73162, longitude: -9.13487 },
      permissions: ["geolocation"],
    });

    test("'Use my current location' places the pin", async ({ page }) => {
      await startHostApplication(page);
      const location = section(page, "Location");
      await location.getByRole("button", { name: "Use my current location" }).click();
      await expect(location.locator('input[name="lat"]')).toHaveValue("38.73162");
      await expect(location.locator('input[name="lng"]')).toHaveValue("-9.13487");
    });
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
