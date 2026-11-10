import { DomainError, nextId } from "@/mocks/errors";
import type {
  DemoDb,
  HostProfile,
  HostReviewDecision,
  HostStatus,
  Weekday,
} from "@/mocks/types";
import { addDays, daysBetween, lisbonDate, lisbonMidnight } from "@/lib/time/lisbon";
import type { HostingErrorCode } from "./form-state";
import { isInPortugal, snapToGrid } from "./location";
import type { HoursInput, ListingInput, LocationInput, TimeOffInput } from "./schemas";

// Host application rules. These were Postgres functions and RLS policies in
// the original backend design (docs/adr/0001); they keep the same rules here
// and run inside a store transaction, so a broken rule changes nothing.
//
//   draft ──submit──▶ pending_review ──approve──▶ approved ◀──reinstate── suspended
//   rejected ─submit─▶       │                       └────────suspend────────▶
//                            └──reject──▶ rejected

const fail = (code: HostingErrorCode): never => {
  throw new DomainError(code);
};

const ownListing = (db: DemoDb, userId: string) =>
  db.hosts.find((host) => host.userId === userId);

/**
 * Who can change a listing: applicants with a draft or rejected application,
 * and approved hosts. Never while an admin is reviewing it, and never while
 * it is suspended (the admin's decision covers the listing as it was).
 */
export const isEditable = (host: Pick<HostProfile, "status">) =>
  host.status !== "pending_review" && host.status !== "suspended";

function assertEditable(host: HostProfile) {
  if (host.status === "pending_review") fail("locked");
  if (host.status === "suspended") fail("suspended");
}

function audit(
  db: DemoDb,
  actorId: string,
  action: string,
  hostId: string,
  details: Record<string, unknown>,
) {
  db.auditLogs.push({
    id: nextId(db.auditLogs),
    actorId,
    action,
    targetTable: "host_profiles",
    targetId: hostId,
    details,
    createdAt: new Date().toISOString(),
  });
}

function notify(
  db: DemoDb,
  userId: string,
  type: string,
  payload: Record<string, unknown>,
) {
  db.notifications.push({
    id: crypto.randomUUID(),
    userId,
    type,
    payload,
    readAt: null,
    createdAt: new Date().toISOString(),
  });
}

// -----------------------------------------------------------------------------

/** Creates the caller's draft listing, or updates it while it is editable. */
export function saveListing(
  db: DemoDb,
  userId: string,
  input: ListingInput,
): HostProfile {
  const now = new Date().toISOString();
  const fields = {
    hostType: input.hostType,
    displayName: input.displayName,
    businessName: input.hostType === "business" ? input.businessName : null,
    rulesText: input.rulesText,
    maxParcelSize: input.maxParcelSize,
    maxDeclaredValueCents: input.maxValueEuros * 100,
    maxConcurrentParcels: input.capacity,
  };

  const existing = ownListing(db, userId);
  if (existing) {
    assertEditable(existing);
    Object.assign(existing, fields, { updatedAt: now });
    return existing;
  }

  // Status, review fields and the public pin are never set by the applicant.
  const host: HostProfile = {
    id: crypto.randomUUID(),
    userId,
    status: "draft",
    areaLabel: null,
    publicLocation: null,
    isPaused: false,
    reviewNote: null,
    reviewedBy: null,
    reviewedAt: null,
    termsVersion: null,
    termsAcceptedAt: null,
    createdAt: now,
    updatedAt: now,
    ...fields,
  };
  db.hosts.push(host);
  return host;
}

/** Replaces the caller's whole weekly schedule (all or nothing). */
export function replaceWeeklyHours(db: DemoDb, userId: string, slots: HoursInput) {
  const host = ownListing(db, userId) ?? fail("noListing");
  assertEditable(host);
  if (slots.some((slot) => slot.closesAt <= slot.opensAt)) fail("closesBeforeOpens");

  db.weeklyHours = db.weeklyHours.filter((slot) => slot.hostId !== host.id);
  db.weeklyHours.push(
    ...slots.map((slot) => ({
      hostId: host.id,
      weekday: slot.weekday as Weekday,
      opensAt: slot.opensAt,
      closesAt: slot.closesAt,
    })),
  );
}

/**
 * Saves the caller's private address and exact point, and derives the public
 * pin from it. The exact point never leaves hostPrivateDetails; customers
 * only ever see publicLocation (snapped to the grid) and the area label.
 */
export function saveLocation(db: DemoDb, userId: string, input: LocationInput) {
  const host = ownListing(db, userId) ?? fail("noListing");
  assertEditable(host);

  const exactLocation = { lng: input.lng, lat: input.lat };
  if (!isInPortugal(exactLocation)) fail("outsidePortugal");

  // A live host may move, but not while customers have been given (or are
  // about to need) the current address: an accepted reservation or a parcel
  // waiting in storage.
  const live = host.status === "approved";
  if (
    live &&
    db.reservations.some(
      (r) =>
        r.hostId === host.id &&
        (r.status === "accepted" || r.status === "awaiting_pickup"),
    )
  )
    fail("activeReservations");

  const details = {
    hostId: host.id,
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2,
    postalCode: input.postalCode,
    city: input.city,
    exactLocation,
    accessInstructions: input.accessInstructions,
  };
  const index = db.hostPrivateDetails.findIndex((d) => d.hostId === host.id);
  if (index === -1) db.hostPrivateDetails.push(details);
  else db.hostPrivateDetails[index] = details;

  const from = host.publicLocation;
  Object.assign(host, {
    areaLabel: input.areaLabel,
    publicLocation: snapToGrid(exactLocation),
    updatedAt: new Date().toISOString(),
  });
  // Admins approved a place; a live host moving is worth a trace. Only the
  // public (snapped) points are logged, never the exact address.
  if (live)
    audit(db, userId, "host.location_changed", host.id, {
      from,
      to: host.publicLocation,
    });
  return host;
}

/** What submitApplication requires, for the checklist in the form. */
export function applicationChecklist(db: DemoDb, host: HostProfile) {
  return {
    listing: true,
    hours: db.weeklyHours.some((slot) => slot.hostId === host.id),
    location:
      host.areaLabel !== null && db.hostPrivateDetails.some((d) => d.hostId === host.id),
  };
}

/** draft/rejected → pending_review, once the application is complete. */
export function submitApplication(db: DemoDb, userId: string, agreementVersion: string) {
  const host = ownListing(db, userId) ?? fail("noListing");
  if (host.status !== "draft" && host.status !== "rejected") fail("alreadySubmitted");

  // An admin should never review a half-filled application.
  const checklist = applicationChecklist(db, host);
  if (!checklist.hours || !checklist.location) fail("incomplete");

  const now = new Date().toISOString();
  const accepted = db.legalAcceptances.some(
    (a) =>
      a.userId === userId &&
      a.document === "host_agreement" &&
      a.version === agreementVersion,
  );
  if (!accepted) {
    db.legalAcceptances.push({
      userId,
      document: "host_agreement",
      version: agreementVersion,
      acceptedAt: now,
    });
  }

  const from = host.status;
  Object.assign(host, {
    status: "pending_review",
    termsVersion: agreementVersion,
    termsAcceptedAt: now,
    updatedAt: now,
  });

  audit(db, userId, "host.application_submitted", host.id, { from, agreementVersion });
  for (const admin of db.users.filter((user) => user.roles.includes("admin"))) {
    notify(db, admin.id, "host.application_submitted", {
      hostId: host.id,
      displayName: host.displayName,
    });
  }
  return host;
}

// Each decision is allowed from exactly one state.
const TRANSITIONS: Record<HostReviewDecision, [from: HostStatus, to: HostStatus]> = {
  approve: ["pending_review", "approved"],
  reject: ["pending_review", "rejected"],
  suspend: ["approved", "suspended"],
  reinstate: ["suspended", "approved"],
};

/** Admin decision on a host. Returns the new status. */
export function reviewHost(
  db: DemoDb,
  adminId: string,
  hostId: string,
  decision: HostReviewDecision,
  note: string | null = null,
): HostStatus {
  // Re-checked against the stored roles, not whatever the UI believed.
  const admin = db.users.find((user) => user.id === adminId);
  if (!admin?.roles.includes("admin")) fail("forbidden");

  const cleanNote = note?.trim() || null;
  if (cleanNote && cleanNote.length > 1000) fail("tooLong");

  const host = db.hosts.find((h) => h.id === hostId) ?? fail("notFound");
  // Four-eyes rule: an admin who is also a host can't approve themselves.
  if (host.userId === adminId) fail("forbidden");

  const [from, to] = TRANSITIONS[decision];
  if (host.status !== from) fail("invalidTransition");
  // The applicant (or host) deserves a reason for a negative decision.
  if ((decision === "reject" || decision === "suspend") && !cleanNote)
    fail("noteRequired");

  const now = new Date().toISOString();
  Object.assign(host, {
    status: to,
    reviewNote: cleanNote,
    reviewedBy: adminId,
    reviewedAt: now,
    updatedAt: now,
  });

  // Approval makes the applicant a host. Suspension keeps the role: the host
  // may still hold parcels that customers need to collect.
  const owner = db.users.find((user) => user.id === host.userId);
  if (to === "approved" && owner && !owner.roles.includes("host"))
    owner.roles.push("host");

  const action = {
    approve: "approved",
    reject: "rejected",
    suspend: "suspended",
    reinstate: "reinstated",
  }[decision];
  audit(db, adminId, `host.${action}`, host.id, { from, to, note: cleanNote });
  notify(db, host.userId, `host.${to}`, { hostId: host.id, note: cleanNote });
  return to;
}

export type HoursByDay = Partial<Record<Weekday, { opensAt: string; closesAt: string }>>;

/** One window per day for the form (the first, if a host has several). */
export function hoursByDay(db: DemoDb, hostId: string): HoursByDay {
  const result: HoursByDay = {};
  const slots = db.weeklyHours
    .filter((slot) => slot.hostId === hostId)
    .sort((a, b) => a.weekday - b.weekday || a.opensAt.localeCompare(b.opensAt));
  for (const slot of slots) {
    result[slot.weekday] ??= { opensAt: slot.opensAt, closesAt: slot.closesAt };
  }
  return result;
}

/**
 * An admin opens a host's private address. Allowed, but every view is
 * audited, so access to home addresses can always be traced.
 */
export function viewPrivateDetails(db: DemoDb, adminId: string, hostId: string) {
  const admin = db.users.find((user) => user.id === adminId);
  if (!admin?.roles.includes("admin")) fail("forbidden");
  const details =
    db.hostPrivateDetails.find((d) => d.hostId === hostId) ?? fail("notFound");
  audit(db, adminId, "host.private_details_viewed", hostId, {});
  return details;
}

// --- Host settings (approved hosts) ---------------------------------------------

function liveListing(db: DemoDb, userId: string) {
  const host = ownListing(db, userId) ?? fail("noListing");
  if (host.status === "suspended") fail("suspended");
  if (host.status !== "approved") fail("notApproved");
  return host;
}

/**
 * Pausing hides the listing from new requests. It's the host's own switch
 * (no audit), and it never touches reservations already made: those parcels
 * still arrive and still need collecting.
 */
export function setPaused(db: DemoDb, userId: string, paused: boolean) {
  const host = liveListing(db, userId);
  if (host.isPaused !== paused) {
    Object.assign(host, { isPaused: paused, updatedAt: new Date().toISOString() });
  }
  return host;
}

export const TIME_OFF_LIMITS = {
  /** Longest single period, in days. */
  maxDays: 60,
  /** How far ahead a period may start, in days. */
  maxAheadDays: 365,
  /** Upcoming periods at once. */
  maxUpcoming: 10,
} as const;

/**
 * Adds a period away, in whole Lisbon days (first and last day inclusive).
 * Stored as [startsAt, endsAt) instants: Lisbon midnight of the first day to
 * Lisbon midnight after the last day.
 */
export function addTimeOff(
  db: DemoDb,
  userId: string,
  input: TimeOffInput,
  now: Date = new Date(),
) {
  const host = liveListing(db, userId);
  const { startDate, endDate } = input;
  const today = lisbonDate(now);

  if (endDate < startDate) fail("endBeforeStart");
  if (startDate < today) fail("inPast");
  if (daysBetween(today, startDate) > TIME_OFF_LIMITS.maxAheadDays) fail("tooFarAhead");
  if (daysBetween(startDate, endDate) + 1 > TIME_OFF_LIMITS.maxDays)
    fail("timeOffTooLong");

  const startsAt = lisbonMidnight(startDate);
  const endsAt = lisbonMidnight(addDays(endDate, 1));
  const own = db.timeOff.filter((t) => t.hostId === host.id);

  if (own.some((t) => t.startsAt < endsAt && startsAt < t.endsAt)) fail("overlaps");
  if (
    own.filter((t) => t.endsAt > now.toISOString()).length >= TIME_OFF_LIMITS.maxUpcoming
  )
    fail("tooManyTimeOff");

  // A host can't promise to receive a parcel and then be away that day.
  // Cancel or decline those first.
  if (
    db.reservations.some(
      (r) =>
        r.hostId === host.id &&
        (r.status === "requested" || r.status === "accepted") &&
        r.expectedDeliveryDate >= startDate &&
        r.expectedDeliveryDate <= endDate,
    )
  )
    fail("reservationsInPeriod");

  const entry = {
    id: crypto.randomUUID(),
    hostId: host.id,
    startsAt,
    endsAt,
    reason: input.reason,
  };
  db.timeOff.push(entry);
  return entry;
}

/** Removes one of the caller's own periods away. */
export function removeTimeOff(db: DemoDb, userId: string, timeOffId: string) {
  const host = ownListing(db, userId) ?? fail("noListing");
  const index = db.timeOff.findIndex((t) => t.id === timeOffId && t.hostId === host.id);
  // Someone else's entry looks exactly like a missing one.
  if (index === -1) fail("notFound");
  db.timeOff.splice(index, 1);
}
