// Calendar days in Portugal. Times are stored as UTC ISO strings, but a host
// thinks in whole local days ("away 12–18 December"), so day boundaries are
// Lisbon midnights, which move between UTC+0 and UTC+1 with summer time.

export const TIME_ZONE = "Europe/Lisbon";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const partsFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

/** Is this a real calendar date in "YYYY-MM-DD" form? */
export function isCalendarDate(value: string) {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  return date.getUTCMonth() === m! - 1 && date.getUTCDate() === d;
}

/** The Lisbon calendar day ("YYYY-MM-DD") of an instant. */
export function lisbonDate(instant: Date | string) {
  return dayFormat.format(new Date(instant));
}

/** Minutes Lisbon is ahead of UTC at this instant (0 or 60). */
function lisbonOffsetMinutes(instant: Date) {
  const parts = Object.fromEntries(
    partsFormat.formatToParts(instant).map((part) => [part.type, Number(part.value)]),
  ) as Record<string, number>;
  const asUtc = Date.UTC(
    parts.year!,
    parts.month! - 1,
    parts.day!,
    parts.hour!,
    parts.minute!,
    parts.second!,
  );
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60_000);
}

/** The instant a Lisbon calendar day starts, as a UTC ISO string. */
export function lisbonMidnight(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const utcMidnight = new Date(Date.UTC(y!, m! - 1, d!));
  // Portugal changes clocks at 01:00 UTC, so local midnight always exists and
  // the offset at UTC midnight is the offset at local midnight.
  const offset = lisbonOffsetMinutes(utcMidnight);
  return new Date(utcMidnight.getTime() - offset * 60_000).toISOString();
}

/** Adds whole days to a "YYYY-MM-DD" date. */
export function addDays(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10);
}

/** Whole days from one "YYYY-MM-DD" date to another. */
export function daysBetween(from: string, to: string) {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000,
  );
}
