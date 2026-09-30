import type { Enums } from "@/types/database";

export type ReservationStatus = Enums<"reservation_status">;

/** The staff dashboard currently serves the Rio pilot only. */
export const PILOT_RESTAURANT_SLUG = "rio-deventer";

/** Statuses staff can choose from, in workflow order. */
export const RESERVATION_STATUSES = [
  "pending",
  "confirmed",
  "seated",
  "completed",
  "cancelled",
] as const satisfies readonly ReservationStatus[];

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: "Nieuw",
  confirmed: "Bevestigd",
  seated: "Gearriveerd",
  completed: "Afgerond",
  cancelled: "Geannuleerd",
  no_show: "Niet verschenen",
};

export function isReservationStatus(value: string): value is ReservationStatus {
  return value in RESERVATION_STATUS_LABELS;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function parseDate(date: string) {
  const match = DATE_PATTERN.exec(date);

  if (!match) {
    return null;
  }

  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const check = new Date(Date.UTC(year, month - 1, day));

  // Rejects dates like 2026-02-31.
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function isValidDate(date: string) {
  return parseDate(date) !== null;
}

export function isValidTime(time: string) {
  return TIME_PATTERN.test(time);
}

/** Wall-clock parts of an instant in the given time zone. */
function zonedParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** Offset of the time zone from UTC at the given instant, in milliseconds. */
function timeZoneOffsetMs(utcMs: number, timeZone: string) {
  const p = zonedParts(new Date(utcMs), timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);

  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/**
 * Converts a local date (YYYY-MM-DD) and time (HH:MM) in the restaurant's
 * time zone to an ISO timestamp, independent of the server's time zone.
 */
export function zonedToIso(date: string, time: string, timeZone: string) {
  const d = parseDate(date);
  const t = TIME_PATTERN.exec(time);

  if (!d || !t) {
    return null;
  }

  const naive = Date.UTC(d.year, d.month - 1, d.day, Number(t[1]), Number(t[2]));
  // Second pass corrects for a DST change between the guess and the result.
  const firstGuess = naive - timeZoneOffsetMs(naive, timeZone);
  const utc = naive - timeZoneOffsetMs(firstGuess, timeZone);

  return new Date(utc).toISOString();
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** Splits an ISO timestamp into local date (YYYY-MM-DD) and time (HH:MM). */
export function isoToZoned(iso: string, timeZone: string) {
  const p = zonedParts(new Date(iso), timeZone);

  return {
    date: `${p.year}-${pad(p.month)}-${pad(p.day)}`,
    time: `${pad(p.hour)}:${pad(p.minute)}`,
  };
}

export function todayInZone(timeZone: string) {
  return isoToZoned(new Date().toISOString(), timeZone).date;
}

export function addDays(date: string, days: number) {
  const d = parseDate(date);

  if (!d) {
    return date;
  }

  const result = new Date(Date.UTC(d.year, d.month - 1, d.day + days));

  return `${result.getUTCFullYear()}-${pad(result.getUTCMonth() + 1)}-${pad(result.getUTCDate())}`;
}

/** E.g. "woensdag 30 september 2026". */
export function formatLongDate(date: string) {
  const d = parseDate(date);

  if (!d) {
    return date;
  }

  return new Intl.DateTimeFormat("nl-NL", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(d.year, d.month - 1, d.day)));
}
