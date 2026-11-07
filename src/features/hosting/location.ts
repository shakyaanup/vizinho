import type { LngLat } from "@/mocks/types";

// Grid step in degrees. At Lisbon's latitude both are roughly 440 m, so a
// public pin is never more than ~310 m (half a cell diagonal) from the house.
const LNG_STEP = 0.005;
const LAT_STEP = 0.004;

const round = (value: number, step: number) =>
  // toFixed removes float noise such as 38.732000000000006.
  Number((Math.round(value / step) * step).toFixed(6));

/**
 * The public map pin for a host: the exact location rounded to a fixed grid.
 * Neighbours in the same cell share a pin, so the exact house can't be
 * recovered from it. Exact coordinates never leave the host's private details.
 */
export function snapToGrid({ lng, lat }: LngLat): LngLat {
  return { lng: round(lng, LNG_STEP), lat: round(lat, LAT_STEP) };
}

/** Great-circle distance in metres (haversine). */
export function distanceMetres(a: LngLat, b: LngLat): number {
  const R = 6_371_000;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
