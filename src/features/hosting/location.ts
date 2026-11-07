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

/**
 * The grid cell a location falls into, as [west, south, east, north]. Every
 * location in this square gets the same public pin (the cell's centre), so
 * it's what customers can learn about where a host lives.
 */
export function gridCell(location: LngLat): [number, number, number, number] {
  const { lng, lat } = snapToGrid(location);
  return [lng - LNG_STEP / 2, lat - LAT_STEP / 2, lng + LNG_STEP / 2, lat + LAT_STEP / 2];
}

/** Mainland Portugal (+ a margin): hosts must be here. [west, south, east, north] */
export const PORTUGAL_BOUNDS = [-9.6, 36.9, -6.1, 42.2] as const;

export function isInPortugal({ lng, lat }: LngLat) {
  const [west, south, east, north] = PORTUGAL_BOUNDS;
  return lng >= west && lng <= east && lat >= south && lat <= north;
}

/** Where the map opens when there's no location yet: central Lisbon. */
export const LISBON_CENTER: LngLat = { lng: -9.1393, lat: 38.7223 };

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
