import { fieldErrorsFrom } from "@/lib/forms/form-state";
import { DomainError } from "@/mocks/errors";
import { getDemoState, transact } from "@/mocks/store";
import type { DemoDb, Weekday } from "@/mocks/types";
import type { HostingErrorCode, HostingFormState } from "./form-state";
import {
  HOST_AGREEMENT_VERSION,
  hoursSchema,
  listingSchema,
  readHoursForm,
  submitSchema,
  type ListingField,
} from "./schemas";
import {
  replaceWeeklyHours,
  saveListing as saveListingRule,
  submitApplication as submitRule,
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
