import { fieldErrorsFrom } from "@/lib/forms/form-state";
import { DomainError } from "@/mocks/errors";
import { getDemoState, transact } from "@/mocks/store";
import type { DemoDb, HostPrivateDetails, HostStatus, Weekday } from "@/mocks/types";
import type { HostingErrorCode, HostingFormState } from "./form-state";
import {
  HOST_AGREEMENT_VERSION,
  hoursSchema,
  listingSchema,
  locationSchema,
  readHoursForm,
  reviewSchema,
  submitSchema,
  timeOffSchema,
  type ListingField,
  type LocationField,
  type TimeOffField,
} from "./schemas";
import {
  addTimeOff as addTimeOffRule,
  removeTimeOff as removeTimeOffRule,
  replaceWeeklyHours,
  reviewHost as reviewHostRule,
  saveLocation as saveLocationRule,
  saveListing as saveListingRule,
  setPaused as setPausedRule,
  submitApplication as submitRule,
  viewPrivateDetails,
} from "./service";

// Form actions for useActionState. They validate with zod, then run the
// business rule inside a store transaction. Same contract as the original
// Server Actions: errors come back as translation keys, never raw text.

/** Runs a rule as the signed-in user; maps broken rules to error codes. */
function runAsCurrentUser(
  rule: (db: DemoDb, userId: string) => unknown,
): HostingErrorCode | null {
  const { userId } = getDemoState();
  if (!userId) return "unauthenticated";
  try {
    transact((db) => rule(db, userId));
    return null;
  } catch (error) {
    if (error instanceof DomainError) return error.code as HostingErrorCode;
    console.error("[hosting] unexpected error", error);
    return "unexpected";
  }
}

export async function saveListing(
  _prev: HostingFormState<ListingField>,
  formData: FormData,
): Promise<HostingFormState<ListingField>> {
  const fields: ListingField[] = [
    "hostType",
    "displayName",
    "businessName",
    "rulesText",
    "maxParcelSize",
    "maxValueEuros",
    "capacity",
  ];
  const values = Object.fromEntries(
    fields.map((field) => [field, String(formData.get(field) ?? "")]),
  ) as Record<ListingField, string>;

  const parsed = listingSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  }

  const error = runAsCurrentUser((db, userId) =>
    saveListingRule(db, userId, parsed.data),
  );
  return error ? { status: "error", formError: error, values } : { status: "success" };
}

type HoursField = `day-${Weekday}`;

export async function saveHours(
  _prev: HostingFormState<HoursField>,
  formData: FormData,
): Promise<HostingFormState<HoursField>> {
  const slots = readHoursForm(formData);
  const parsed = hoursSchema.safeParse(slots);

  if (!parsed.success) {
    const fieldErrors: Partial<Record<HoursField, HostingErrorCode>> = {};
    let formError: HostingErrorCode | undefined;
    for (const issue of parsed.error.issues) {
      const index = issue.path[0];
      const slot = typeof index === "number" ? slots[index] : undefined;
      if (slot)
        fieldErrors[`day-${slot.weekday as Weekday}`] ??=
          issue.message as HostingErrorCode;
      else formError ??= issue.message as HostingErrorCode;
    }
    return { status: "error", formError, fieldErrors };
  }

  const error = runAsCurrentUser((db, userId) =>
    replaceWeeklyHours(db, userId, parsed.data),
  );
  return error ? { status: "error", formError: error } : { status: "success" };
}

export async function submitApplication(
  _prev: HostingFormState<"acceptAgreement">,
  formData: FormData,
): Promise<HostingFormState<"acceptAgreement">> {
  const parsed = submitSchema.safeParse({
    acceptAgreement: formData.get("acceptAgreement"),
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const error = runAsCurrentUser((db, userId) =>
    submitRule(db, userId, HOST_AGREEMENT_VERSION),
  );
  return error ? { status: "error", formError: error } : { status: "success" };
}

const LOCATION_FIELDS: LocationField[] = [
  "addressLine1",
  "addressLine2",
  "postalCode",
  "city",
  "areaLabel",
  "accessInstructions",
  "lng",
  "lat",
];

export async function saveLocation(
  _prev: HostingFormState<LocationField>,
  formData: FormData,
): Promise<HostingFormState<LocationField>> {
  const values = Object.fromEntries(
    LOCATION_FIELDS.map((field) => [field, String(formData.get(field) ?? "")]),
  ) as Record<LocationField, string>;

  const parsed = locationSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  }

  const error = runAsCurrentUser((db, userId) =>
    saveLocationRule(db, userId, parsed.data),
  );
  return error ? { status: "error", formError: error, values } : { status: "success" };
}

// --- Host settings --------------------------------------------------------------

/** One-click actions (no form fields) report success or an error code. */
export type ActionResult = { ok: true } | { ok: false; error: HostingErrorCode };

const toResult = (error: HostingErrorCode | null): ActionResult =>
  error ? { ok: false, error } : { ok: true };

/** Pauses or resumes new requests for the caller's listing. */
export function setPaused(paused: boolean): ActionResult {
  return toResult(runAsCurrentUser((db, userId) => setPausedRule(db, userId, paused)));
}

const TIME_OFF_FIELDS: TimeOffField[] = ["startDate", "endDate", "reason"];

export async function addTimeOff(
  _prev: HostingFormState<TimeOffField>,
  formData: FormData,
): Promise<HostingFormState<TimeOffField>> {
  const values = Object.fromEntries(
    TIME_OFF_FIELDS.map((field) => [field, String(formData.get(field) ?? "")]),
  ) as Record<TimeOffField, string>;

  const parsed = timeOffSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  }

  const error = runAsCurrentUser((db, userId) => addTimeOffRule(db, userId, parsed.data));
  return error ? { status: "error", formError: error, values } : { status: "success" };
}

export function removeTimeOff(timeOffId: string): ActionResult {
  return toResult(
    runAsCurrentUser((db, userId) => removeTimeOffRule(db, userId, timeOffId)),
  );
}

// --- Admin ----------------------------------------------------------------------

export type ReviewState =
  | { status: "idle" }
  | { status: "error"; formError?: HostingErrorCode; noteError?: HostingErrorCode }
  | { status: "success"; newStatus: HostStatus };

/** Approve / reject / suspend / reinstate. The decision is the pressed button. */
export async function reviewHost(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const parsed = reviewSchema.safeParse({
    hostId: formData.get("hostId"),
    decision: formData.get("decision"),
    note: String(formData.get("note") ?? ""),
  });
  if (!parsed.success) return { status: "error", formError: "unexpected" };

  const { hostId, decision, note } = parsed.data;
  let newStatus: HostStatus | undefined;
  const error = runAsCurrentUser((db, userId) => {
    newStatus = reviewHostRule(db, userId, hostId, decision, note);
  });
  if (error === "noteRequired" || error === "tooLong")
    return { status: "error", noteError: error };
  if (error || !newStatus) return { status: "error", formError: error ?? "unexpected" };
  return { status: "success", newStatus };
}

/** Reveals a host's private address to an admin, writing an audit entry. */
export function revealPrivateDetails(
  hostId: string,
): { ok: true; details: HostPrivateDetails } | { ok: false; error: HostingErrorCode } {
  let details: HostPrivateDetails | undefined;
  const error = runAsCurrentUser((db, userId) => {
    details = viewPrivateDetails(db, userId, hostId);
  });
  return error || !details
    ? { ok: false, error: error ?? "unexpected" }
    : { ok: true, details };
}
