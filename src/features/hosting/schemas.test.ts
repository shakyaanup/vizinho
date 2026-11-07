import { hoursSchema, listingSchema, locationSchema, readHoursForm } from "./schemas";

const listing = {
  hostType: "individual",
  displayName: "Hugo in Arroios",
  businessName: "",
  rulesText: "",
  maxParcelSize: "medium",
  maxValueEuros: "200",
  capacity: "6",
};

const issuesOf = (result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) =>
  Object.fromEntries(
    (result.error?.issues ?? []).map((i) => [String(i.path[0]), i.message]),
  );

describe("listingSchema", () => {
  it("parses form strings into typed values and turns empty text into null", () => {
    const result = listingSchema.parse(listing);
    expect(result).toMatchObject({
      maxValueEuros: 200,
      capacity: 6,
      businessName: null,
      rulesText: null,
    });
  });

  it("requires a business name only for businesses", () => {
    const result = listingSchema.safeParse({ ...listing, hostType: "business" });
    expect(issuesOf(result)).toEqual({ businessName: "businessName" });
    expect(
      listingSchema.safeParse({
        ...listing,
        hostType: "business",
        businessName: "Papelaria Sousa",
      }).success,
    ).toBe(true);
  });

  it("rejects out-of-range or fractional limits with translation keys", () => {
    const result = listingSchema.safeParse({
      ...listing,
      maxValueEuros: "1500",
      capacity: "2.5",
    });
    expect(issuesOf(result)).toEqual({ maxValueEuros: "maxValue", capacity: "capacity" });
  });

  it("rejects unknown enum values", () => {
    expect(
      issuesOf(listingSchema.safeParse({ ...listing, maxParcelSize: "huge" })),
    ).toEqual({
      maxParcelSize: "invalidChoice",
    });
  });
});

describe("opening hours", () => {
  const form = (entries: Record<string, string>) => {
    const data = new FormData();
    for (const [key, value] of Object.entries(entries)) data.set(key, value);
    return data;
  };

  it("reads only the days that are switched on", () => {
    const slots = readHoursForm(
      form({
        "open-1": "on",
        "opens-1": "18:00",
        "closes-1": "21:00",
        "opens-2": "09:00",
        "closes-2": "12:00",
      }),
    );
    expect(slots).toEqual([{ weekday: 1, opensAt: "18:00", closesAt: "21:00" }]);
  });

  it("requires at least one open day", () => {
    expect(hoursSchema.safeParse([]).error?.issues[0]?.message).toBe("noHours");
  });

  it("rejects a window that closes before it opens", () => {
    const result = hoursSchema.safeParse([
      { weekday: 3, opensAt: "21:00", closesAt: "18:00" },
    ]);
    expect(result.error?.issues[0]).toMatchObject({
      path: [0],
      message: "closesBeforeOpens",
    });
  });

  it("rejects malformed times", () => {
    const result = hoursSchema.safeParse([
      { weekday: 3, opensAt: "25:00", closesAt: "26:00" },
    ]);
    expect(result.error?.issues[0]?.message).toBe("time");
  });
});

describe("locationSchema", () => {
  const form = {
    addressLine1: "Rua de Arroios 42",
    addressLine2: "",
    postalCode: "1150-054",
    city: "Lisboa",
    areaLabel: "Arroios, Lisboa",
    accessInstructions: "",
    lng: "-9.13487",
    lat: "38.73162",
  };

  it("parses coordinates from hidden inputs", () => {
    expect(locationSchema.parse(form)).toMatchObject({
      lng: -9.13487,
      lat: 38.73162,
      addressLine2: null,
    });
  });

  it("asks for the pin when it was never placed, and for a valid postcode", () => {
    const result = locationSchema.safeParse({
      ...form,
      lng: "",
      lat: "",
      postalCode: "1150",
    });
    expect(issuesOf(result)).toEqual({
      lng: "locationRequired",
      lat: "locationRequired",
      postalCode: "postalCode",
    });
  });

  it("refuses points outside mainland Portugal", () => {
    // Madrid: same latitude band as Portugal, but too far east.
    expect(
      issuesOf(locationSchema.safeParse({ ...form, lng: "-3.70", lat: "40.41" })),
    ).toEqual({
      lng: "outsidePortugal",
    });
  });
});
