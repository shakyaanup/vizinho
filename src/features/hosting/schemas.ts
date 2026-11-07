import { z } from "zod";
import type { HostType, ParcelSize } from "@/mocks/types";

/** Version of the host agreement the applicant accepts on submission. */
export const HOST_AGREEMENT_VERSION = "2026-11";

export const HOST_TYPES = [
  "individual",
  "business",
] as const satisfies readonly HostType[];
export const PARCEL_SIZES = [
  "small",
  "medium",
  "large",
] as const satisfies readonly ParcelSize[];

/** ISO weekdays, Monday = 1 … Sunday = 7 (same as WeeklyHours.weekday). */
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export type Weekday = (typeof WEEKDAYS)[number];

// Messages are keys of Hosting.errors in the message files.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "tooLong")
    .transform((value) => value || null);

export const listingSchema = z
  .object({
    hostType: z.enum(HOST_TYPES, "invalidChoice"),
    displayName: z.string().trim().min(2, "displayName").max(60, "displayName"),
    businessName: optionalText(120),
    rulesText: optionalText(1000),
    maxParcelSize: z.enum(PARCEL_SIZES, "invalidChoice"),
    // Entered in whole euros; stored as integer cents (max €1000, DB check).
    maxValueEuros: z.coerce
      .number("maxValue")
      .int("maxValue")
      .min(1, "maxValue")
      .max(1000, "maxValue"),
    capacity: z.coerce
      .number("capacity")
      .int("capacity")
      .min(1, "capacity")
      .max(50, "capacity"),
  })
  .refine((v) => v.hostType !== "business" || (v.businessName?.length ?? 0) >= 2, {
    path: ["businessName"],
    message: "businessName",
  });

export type ListingInput = z.infer<typeof listingSchema>;
export type ListingField = keyof z.input<typeof listingSchema>;

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "time");

/** One opening slot per open day. */
export const hoursSchema = z
  .array(
    z
      .object({ weekday: z.number().int().min(1).max(7), opensAt: time, closesAt: time })
      .refine((slot) => slot.closesAt > slot.opensAt, "closesBeforeOpens"),
  )
  .min(1, "noHours")
  .max(7);

export type HoursInput = z.infer<typeof hoursSchema>;

/**
 * Reads the hours form: per weekday an "open-N" checkbox plus "opens-N" and
 * "closes-N" time inputs. Closed days are skipped.
 */
export function readHoursForm(formData: FormData) {
  return WEEKDAYS.filter((day) => formData.get(`open-${day}`) === "on").map((day) => ({
    weekday: day,
    opensAt: String(formData.get(`opens-${day}`) ?? ""),
    closesAt: String(formData.get(`closes-${day}`) ?? ""),
  }));
}

export const submitSchema = z.object({
  acceptAgreement: z.literal("on", "acceptAgreement"),
});

// Hidden inputs post strings; an empty one means the pin was never placed.
const coordinate = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, "locationRequired")
    .transform(Number)
    .pipe(
      z
        .number("locationRequired")
        .min(min, "outsidePortugal")
        .max(max, "outsidePortugal"),
    );

/** The host's private address and the exact point on the map. */
export const locationSchema = z.object({
  addressLine1: z.string().trim().min(3, "addressLine1").max(120, "addressLine1"),
  addressLine2: optionalText(120),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{3}$/, "postalCode"),
  city: z.string().trim().min(2, "city").max(80, "city"),
  areaLabel: z.string().trim().min(2, "areaLabel").max(80, "areaLabel"),
  accessInstructions: optionalText(500),
  // Mainland Portugal, matching PORTUGAL_BOUNDS.
  lng: coordinate(-9.6, -6.1),
  lat: coordinate(36.9, 42.2),
});

export type LocationInput = z.infer<typeof locationSchema>;
export type LocationField = keyof z.input<typeof locationSchema>;
