import { demoLogin, expect, heading, section, test, visible } from "./fixtures";

/** A Lisbon calendar day `offset` days from today, as "YYYY-MM-DD". */
const lisbonDay = (offset: number) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(
    new Date(Date.now() + offset * 86_400_000),
  );

test.describe("host settings", () => {
  test("a host pauses new requests and resumes them", async ({ page }) => {
    await demoLogin(page, "host");
    await visible(page.getByRole("link", { name: "Schedule and time off" })).click();
    await expect(page).toHaveURL("/host/schedule");
    await expect(heading(page)).toHaveText("Schedule");

    const requests = section(page, "New requests");
    await expect(requests.getByText("Open: customers can send you")).toBeVisible();
    await requests.getByRole("button", { name: "Pause new requests" }).click();
    await expect(requests.getByRole("status")).toHaveText("New requests paused.");
    await expect(requests.getByText("Paused", { exact: true })).toBeVisible();
    await expect(
      requests.getByText("Reservations you've already accepted carry on"),
    ).toBeVisible();

    // The dashboard shows the paused listing too.
    await visible(page.getByRole("link", { name: "Dashboard" })).click();
    await expect(page).toHaveURL("/host");
    await expect(
      section(page, "Hugo in Arroios").getByText("Paused", { exact: true }),
    ).toBeVisible();

    await visible(page.getByRole("link", { name: "Schedule and time off" })).click();
    await section(page, "New requests")
      .getByRole("button", { name: "Resume new requests" })
      .click();
    await expect(section(page, "New requests").getByRole("status")).toHaveText(
      "New requests resumed.",
    );
  });

  test("a host plans time off within the rules", async ({ page }) => {
    await demoLogin(page, "host");
    await page.goto("/host/schedule");
    const timeOff = section(page, "Time off");
    await expect(timeOff.getByText("No time off planned.")).toBeVisible();

    const add = timeOff.getByRole("button", { name: "Add time off" });
    const first = timeOff.getByLabel("First day away");
    const last = timeOff.getByLabel("Last day away");

    // Backwards dates are caught before the rules run.
    await first.fill(lisbonDay(20));
    await last.fill(lisbonDay(18));
    await add.click();
    await expect(
      timeOff.getByText("The last day can't be before the first day."),
    ).toBeVisible();
    await expect(first).toHaveValue(lisbonDay(20));

    // Carla asked Hugo to receive a parcel in three days.
    await first.fill(lisbonDay(2));
    await last.fill(lisbonDay(4));
    await add.click();
    await expect(timeOff.getByText("A parcel is due on one of those days")).toBeVisible();

    await first.fill(lisbonDay(20));
    await last.fill(lisbonDay(22));
    await timeOff.getByLabel("Note (optional)").fill("Visiting family");
    await add.click();
    await expect(timeOff.getByText("Time off added.")).toBeVisible();
    // The form is cleared for the next one.
    await expect(first).toHaveValue("");

    const planned = timeOff.getByRole("list", { name: "Planned time off" });
    await expect(planned.getByRole("listitem")).toHaveCount(1);
    await expect(planned.getByText("Visiting family")).toBeVisible();

    // The same days again overlap.
    await first.fill(lisbonDay(22));
    await last.fill(lisbonDay(23));
    await add.click();
    await expect(
      timeOff.getByText("This overlaps time off you've already planned."),
    ).toBeVisible();

    await planned.getByRole("button", { name: /^Remove time off/ }).click();
    await expect(timeOff.getByText("Time off removed.")).toBeVisible();
    await expect(timeOff.getByText("No time off planned.")).toBeVisible();
  });

  test("a host edits their live listing but can't move while holding a parcel", async ({
    page,
  }) => {
    await demoLogin(page, "host");
    await visible(page.getByRole("link", { name: "Edit listing" })).click();
    await expect(page).toHaveURL("/host/listing");
    await expect(heading(page)).toHaveText("Your listing");

    const details = section(page, "Listing details");
    await details.getByLabel("Listing name").fill("Hugo, Arroios");
    await details.getByLabel("Parcels at the same time").fill("6");
    await details.getByRole("button", { name: "Save listing" }).click();
    await expect(details.getByText("Listing saved.")).toBeVisible();

    // Hugo is holding Rui's parcel, so his address can't change yet.
    const location = section(page, "Location");
    await expect(location.getByLabel("Street and number")).toHaveValue(
      "Rua de Arroios 42",
    );
    await location.getByRole("button", { name: "Save location" }).click();
    await expect(
      location.getByText("You have accepted reservations or parcels in storage."),
    ).toBeVisible();

    await visible(page.getByRole("link", { name: "Dashboard" })).click();
    await expect(page.getByRole("heading", { name: "Hugo, Arroios" })).toBeVisible();
    await expect(page.getByText("Up to 6 parcels at a time")).toBeVisible();
  });
});
