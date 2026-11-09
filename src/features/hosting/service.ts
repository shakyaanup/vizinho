import { DomainError, nextId } from "@/mocks/errors";
import type {
  DemoDb,
  HostProfile,
  HostReviewDecision,
  HostStatus,
  Weekday,
} from "@/mocks/types";
import type { HostingErrorCode } from "./form-state";
import { isInPortugal, snapToGrid } from "./location";
import type { HoursInput, ListingInput, LocationInput } from "./schemas";

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

/** Applicants can edit a draft or a rejected application, never one in review. */
export const isEditable = (host: Pick<HostProfile, "status">) =>
  host.status !== "pending_review";

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
    if (!isEditable(existing)) fail("locked");
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
  if (!isEditable(host)) fail("locked");
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
  if (!isEditable(host)) fail("locked");

  const exactLocation = { lng: input.lng, lat: input.lat };
  if (!isInPortugal(exactLocation)) fail("outsidePortugal");

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

  Object.assign(host, {
    areaLabel: input.areaLabel,
    publicLocation: snapToGrid(exactLocation),
    updatedAt: new Date().toISOString(),
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
