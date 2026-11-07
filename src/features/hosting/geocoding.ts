import type { LngLat } from "@/mocks/types";
import { PORTUGAL_BOUNDS } from "./location";

// Address search with Photon (https://photon.komoot.io), a free, key-free
// geocoder built on OpenStreetMap data. Fair use: we only search after the
// user stops typing and cap results at 5.

const PHOTON_URL = "https://photon.komoot.io/api/";

export type AddressSuggestion = {
  id: string;
  /** One line for the results list, e.g. "Rua de Arroios 42A, 1150-055 Lisboa". */
  label: string;
  addressLine1: string;
  postalCode: string;
  city: string;
  /** Neighbourhood shown to customers, e.g. "Arroios, Lisboa". */
  areaLabel: string;
  location: LngLat;
};

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_type?: string;
    osm_id?: number;
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    district?: string;
    locality?: string;
    countrycode?: string;
  };
};

/** Turns a Photon result into form values. Results outside Portugal are dropped. */
export function toSuggestion(feature: PhotonFeature): AddressSuggestion | null {
  const p = feature.properties;
  if (p.countrycode && p.countrycode !== "PT") return null;

  const [lng, lat] = feature.geometry.coordinates;
  const streetLine = p.street
    ? [p.street, p.housenumber].filter(Boolean).join(" ")
    : (p.name ?? "");
  if (!streetLine) return null;

  const city = p.city ?? p.locality ?? "";
  const neighbourhood = p.district ?? p.locality;
  // Only accept a well-formed Portuguese postcode; the user can type it otherwise.
  const postalCode = /^\d{4}-\d{3}$/.test(p.postcode ?? "") ? p.postcode! : "";

  return {
    id: `${p.osm_type ?? "x"}${p.osm_id ?? `${lng},${lat}`}`,
    label: [streetLine, [postalCode, city].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", "),
    addressLine1: streetLine,
    postalCode,
    city,
    areaLabel: [neighbourhood !== city ? neighbourhood : null, city]
      .filter(Boolean)
      .join(", "),
    location: { lng, lat },
  };
}

/** Searches addresses in Portugal, biased towards `near`. */
export async function searchAddresses(
  query: string,
  near: LngLat,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  const params = new URLSearchParams({
    q: query,
    limit: "5",
    lat: String(near.lat),
    lon: String(near.lng),
    bbox: PORTUGAL_BOUNDS.join(","),
  });
  const response = await fetch(`${PHOTON_URL}?${params}`, { signal });
  if (!response.ok) throw new Error(`Photon responded ${response.status}`);
  const { features = [] } = (await response.json()) as { features?: PhotonFeature[] };

  const seen = new Set<string>();
  return features
    .map(toSuggestion)
    .filter(
      (s): s is AddressSuggestion =>
        s !== null && !seen.has(s.label) && !!seen.add(s.label),
    );
}
