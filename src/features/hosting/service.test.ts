import { DomainError } from "@/mocks/errors";
import {
  createSeed,
  DEMO_USER_IDS,
  HUGO_HOST_ID,
  mockHostId,
  ownerId,
} from "@/mocks/seed";
import type { DemoDb, User } from "@/mocks/types";
import type { ListingInput, LocationInput } from "./schemas";
import {
  applicationChecklist,
  replaceWeeklyHours,
  reviewHost,
  saveListing,
  saveLocation,
  submitApplication,
} from "./service";

const listing: ListingInput = {
  hostType: "individual",
  displayName: "Hana's Corner",
  businessName: null,
  rulesText: null,
  maxParcelSize: "medium",
  maxValueEuros: 200,
  capacity: 4,
};

/** Asserts that `fn` breaks the rule with this error code. */
function expectRule(fn: () => unknown, code: string) {
  let error: unknown;
  try {
    fn();
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(DomainError);
  expect((error as DomainError).code).toBe(code);
}

let db: DemoDb;
let hana: User;
const ADMIN = DEMO_USER_IDS.admin;

function addUser(id: string, roles: User["roles"] = ["customer"]): User {
  const user: User = {
    id,
    email: `${id}@test.local`,
    fullName: id,
    locale: "en",
    roles,
    passwordHash: null,
    termsVersion: "2026-11",
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  return user;
}

/** Hana's application with everything the submit check needs. */
function completeApplication() {
  const host = saveListing(db, hana.id, listing);
  replaceWeeklyHours(db, hana.id, [{ weekday: 1, opensAt: "18:00", closesAt: "21:00" }]);
  // The location step (map picker) arrives later; set it the way it will.
  host.areaLabel = "Arroios, Lisboa";
  db.hostPrivateDetails.push({
    hostId: host.id,
    addressLine1: "Rua de Arroios 10",
    addressLine2: null,
    postalCode: "1150-054",
    city: "Lisboa",
    exactLocation: { lng: -9.1349, lat: 38.7316 },
    accessInstructions: null,
  });
  return host;
}

beforeEach(() => {
  db = createSeed(new Date("2026-11-07T10:00:00Z"));
  hana = addUser("hana");
});

describe("drafting an application", () => {
  it("creates a draft the applicant can't approve themselves", () => {
    const host = saveListing(db, hana.id, listing);
    expect(host).toMatchObject({
      status: "draft",
      userId: hana.id,
      publicLocation: null,
    });
  });

  it("updates the same draft on the next save", () => {
    saveListing(db, hana.id, listing);
    saveListing(db, hana.id, { ...listing, displayName: "Hana in Arroios" });
    const mine = db.hosts.filter((h) => h.userId === hana.id);
    expect(mine).toHaveLength(1);
    expect(mine[0]!.displayName).toBe("Hana in Arroios");
  });

  it("drops the business name for individuals and stores money in cents", () => {
    const host = saveListing(db, hana.id, { ...listing, businessName: "Ignored" });
    expect(host.businessName).toBeNull();
    expect(host.maxDeclaredValueCents).toBe(20_000);
  });

  it("replaces the weekly schedule as a whole", () => {
    saveListing(db, hana.id, listing);
    replaceWeeklyHours(db, hana.id, [
      { weekday: 1, opensAt: "18:00", closesAt: "21:00" },
      { weekday: 6, opensAt: "10:00", closesAt: "13:00" },
    ]);
    replaceWeeklyHours(db, hana.id, [
      { weekday: 2, opensAt: "09:00", closesAt: "12:00" },
    ]);
    const host = db.hosts.find((h) => h.userId === hana.id)!;
    expect(
      db.weeklyHours.filter((s) => s.hostId === host.id).map((s) => s.weekday),
    ).toEqual([2]);
  });

  it("refuses hours without a listing, or closing before opening", () => {
    expectRule(() => replaceWeeklyHours(db, hana.id, []), "noListing");
    saveListing(db, hana.id, listing);
    expectRule(
      () =>
        replaceWeeklyHours(db, hana.id, [
          { weekday: 3, opensAt: "21:00", closesAt: "18:00" },
        ]),
      "closesBeforeOpens",
    );
  });
});

describe("submitting", () => {
  it("requires a listing, hours and a location", () => {
    expectRule(() => submitApplication(db, hana.id, "2026-11"), "noListing");
    const host = saveListing(db, hana.id, listing);
    expect(applicationChecklist(db, host)).toEqual({
      listing: true,
      hours: false,
      location: false,
    });
    expectRule(() => submitApplication(db, hana.id, "2026-11"), "incomplete");
  });

  it("moves a complete draft to review, records the agreement and tells every admin", () => {
    const host = completeApplication();
    submitApplication(db, hana.id, "2026-11");

    expect(host.status).toBe("pending_review");
    expect(db.legalAcceptances).toContainEqual(
      expect.objectContaining({
        userId: hana.id,
        document: "host_agreement",
        version: "2026-11",
      }),
    );
    expect(db.auditLogs.at(-1)).toMatchObject({
      action: "host.application_submitted",
      actorId: hana.id,
      targetId: host.id,
    });
    const admins = db.users.filter((u) => u.roles.includes("admin"));
    const notified = db.notifications.filter(
      (n) => n.type === "host.application_submitted",
    );
    expect(notified.map((n) => n.userId)).toEqual(admins.map((a) => a.id));
  });

  it("locks the application while it is in review", () => {
    completeApplication();
    submitApplication(db, hana.id, "2026-11");
    expectRule(() => submitApplication(db, hana.id, "2026-11"), "alreadySubmitted");
    expectRule(() => saveListing(db, hana.id, listing), "locked");
    expectRule(() => replaceWeeklyHours(db, hana.id, []), "locked");
  });
});

describe("admin review", () => {
  beforeEach(() => {
    completeApplication();
    submitApplication(db, hana.id, "2026-11");
  });
  const hanaHost = () => db.hosts.find((h) => h.userId === hana.id)!;

  it("only admins can review, and not via a stale role in the UI", () => {
    expectRule(() => reviewHost(db, hana.id, hanaHost().id, "approve"), "forbidden");
    expectRule(
      () => reviewHost(db, DEMO_USER_IDS.customer, hanaHost().id, "approve"),
      "forbidden",
    );
  });

  it("approval grants the host role, records the reviewer and notifies", () => {
    expect(reviewHost(db, ADMIN, hanaHost().id, "approve")).toBe("approved");
    expect(hanaHost()).toMatchObject({ status: "approved", reviewedBy: ADMIN });
    expect(hana.roles).toContain("host");
    expect(db.notifications.at(-1)).toMatchObject({
      userId: hana.id,
      type: "host.approved",
    });
    expect(db.auditLogs.at(-1)).toMatchObject({
      action: "host.approved",
      actorId: ADMIN,
    });
  });

  it("each decision is allowed from one state only", () => {
    expectRule(
      () => reviewHost(db, ADMIN, hanaHost().id, "suspend", "x"),
      "invalidTransition",
    );
    reviewHost(db, ADMIN, hanaHost().id, "approve");
    expectRule(
      () => reviewHost(db, ADMIN, hanaHost().id, "approve"),
      "invalidTransition",
    );
  });

  it("rejecting or suspending needs a note; suspension keeps the host role", () => {
    expectRule(
      () => reviewHost(db, ADMIN, hanaHost().id, "reject", "   "),
      "noteRequired",
    );
    reviewHost(db, ADMIN, hanaHost().id, "approve");
    expect(reviewHost(db, ADMIN, hanaHost().id, "suspend", "Missed pickups")).toBe(
      "suspended",
    );
    expect(hana.roles).toContain("host");
    expect(reviewHost(db, ADMIN, hanaHost().id, "reinstate")).toBe("approved");
  });

  it("a rejected applicant can read the note, fix and resubmit", () => {
    reviewHost(db, ADMIN, hanaHost().id, "reject", "Please add weekend hours.");
    expect(hanaHost().reviewNote).toBe("Please add weekend hours.");
    saveListing(db, hana.id, { ...listing, displayName: "Hana in Arroios" });
    submitApplication(db, hana.id, "2026-11");
    expect(hanaHost().status).toBe("pending_review");
  });

  it("an admin cannot review their own listing (four-eyes rule)", () => {
    const olga = addUser("olga", ["customer", "admin"]);
    saveListing(db, olga.id, listing);
    const olgaHost = db.hosts.find((h) => h.userId === olga.id)!;
    olgaHost.status = "pending_review";
    expectRule(() => reviewHost(db, olga.id, olgaHost.id, "approve"), "forbidden");
  });

  it("works on seeded applications too", () => {
    expect(reviewHost(db, ADMIN, mockHostId(18), "approve")).toBe("approved");
    expect(db.users.find((u) => u.id === ownerId(18))!.roles).toContain("host");
    expectRule(() => reviewHost(db, ADMIN, "missing", "approve"), "notFound");
    expect(db.hosts.find((h) => h.id === HUGO_HOST_ID)!.status).toBe("approved");
  });
});

describe("saving the location", () => {
  const input: LocationInput = {
    addressLine1: "Rua de Arroios 42",
    addressLine2: "2º Esq.",
    postalCode: "1150-054",
    city: "Lisboa",
    areaLabel: "Arroios, Lisboa",
    accessInstructions: null,
    lng: -9.13487,
    lat: 38.73162,
  };

  it("needs a listing first", () => {
    expectRule(() => saveLocation(db, hana.id, input), "noListing");
  });

  it("keeps the exact point private and publishes only the snapped pin", () => {
    saveListing(db, hana.id, listing);
    const host = saveLocation(db, hana.id, input);
    expect(host.publicLocation).toEqual({ lng: -9.135, lat: 38.732 });
    expect(host.areaLabel).toBe("Arroios, Lisboa");
    const details = db.hostPrivateDetails.find((d) => d.hostId === host.id)!;
    expect(details.exactLocation).toEqual({ lng: -9.13487, lat: 38.73162 });
    expect(applicationChecklist(db, host).location).toBe(true);
  });

  it("updates the same record when saved again", () => {
    const host = saveListing(db, hana.id, listing);
    saveLocation(db, hana.id, input);
    saveLocation(db, hana.id, { ...input, addressLine1: "Rua de Arroios 44" });
    const mine = db.hostPrivateDetails.filter((d) => d.hostId === host.id);
    expect(mine.map((d) => d.addressLine1)).toEqual(["Rua de Arroios 44"]);
  });

  it("refuses places outside mainland Portugal, and edits while in review", () => {
    saveListing(db, hana.id, listing);
    expectRule(
      () => saveLocation(db, hana.id, { ...input, lng: -3.7, lat: 40.4 }),
      "outsidePortugal",
    );
    completeApplication();
    submitApplication(db, hana.id, "2026-11");
    expectRule(() => saveLocation(db, hana.id, input), "locked");
  });
});
