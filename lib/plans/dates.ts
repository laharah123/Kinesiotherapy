/**
 * Local calendar-day helpers.
 *
 * Everything the plan and progress code stores is keyed by the device's local
 * calendar day, never by UTC, so a session finished at 23:30 belongs to that
 * evening rather than to the next morning.
 *
 * lib/supabase.ts exports an identical `localDateString`. This copy exists so
 * the plan code keeps working when the Supabase module is mocked or when
 * Supabase is not configured at all.
 */

/** YYYY-MM-DD for the device's local calendar day (not UTC). */
export function localDateString(d: Date = new Date()): string {
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day   = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parses YYYY-MM-DD as a local midnight Date. Returns null when unparseable. */
export function parseLocalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : startOfDay(parsed);
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Normalises any date-ish string to a local YYYY-MM-DD key. */
export function toLocalDateKey(value: string | null | undefined): string {
  const parsed = parseLocalDate(value);
  return parsed ? localDateString(parsed) : localDateString();
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Local date `days` days after `from`, as YYYY-MM-DD. */
export function addDays(days: number, from: Date = new Date()): string {
  const d = startOfDay(from);
  d.setDate(d.getDate() + days);
  return localDateString(d);
}

/**
 * Whole calendar days between two YYYY-MM-DD keys (later minus earlier).
 * Returns 0 when either side is missing.
 */
export function daysBetween(from: string | null | undefined, to: string | null | undefined): number {
  const a = parseLocalDate(from);
  const b = parseLocalDate(to);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** The last `count` local calendar days, oldest first, ending today. */
export function lastLocalDates(count: number, today: Date = new Date()): string[] {
  return Array.from({ length: count }, (_, i) => addDays(i - (count - 1), today));
}

/** Single-letter weekday initials for the given YYYY-MM-DD keys, in the device locale. */
export function dayInitials(dates: string[]): string[] {
  return dates.map((key) => {
    const d = parseLocalDate(key);
    if (!d) return '';
    const label = d.toLocaleDateString(undefined, { weekday: 'short' });
    return label.charAt(0).toUpperCase();
  });
}
