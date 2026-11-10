import type { HostPrivateDetails, HostProfile } from "@/mocks/types";
import type { ListingDefaults } from "./ListingForm";
import type { LocationDefaults } from "./LocationForm";

// What the listing and location forms start with: the saved values, or
// sensible defaults for a new application. Shared by the application page
// and the host's listing settings.

export function listingDefaults(listing: HostProfile | null): ListingDefaults {
  return {
    hostType: listing?.hostType ?? "individual",
    displayName: listing?.displayName ?? "",
    businessName: listing?.businessName ?? "",
    rulesText: listing?.rulesText ?? "",
    maxParcelSize: listing?.maxParcelSize ?? "medium",
    maxValueEuros: String((listing?.maxDeclaredValueCents ?? 20000) / 100),
    capacity: String(listing?.maxConcurrentParcels ?? 5),
  };
}

export function locationDefaults(
  listing: HostProfile | null,
  address: HostPrivateDetails | null,
): LocationDefaults {
  return {
    addressLine1: address?.addressLine1 ?? "",
    addressLine2: address?.addressLine2 ?? "",
    postalCode: address?.postalCode ?? "",
    city: address?.city ?? "Lisboa",
    areaLabel: listing?.areaLabel ?? "",
    accessInstructions: address?.accessInstructions ?? "",
    location: address?.exactLocation ?? null,
  };
}
