/**
 * Date utilities — the canonical entry points for date-only ISO strings.
 *
 * ## Why this file exists
 *
 * `date-fns#parseISO("YYYY-MM-DD")` parses a date-only string as
 * **UTC midnight**. `format(date, "yyyy-MM-dd")` emits in **local tz**.
 * Round-tripping a date-only string through `parseISO → format` therefore
 * drifts by one day whenever the UTC → local translation crosses midnight
 * (i.e. any non-UTC timezone). In AgarthaOS this showed up as the
 * attendance page eyebrow ("Apr 18") disagreeing with the date picker
 * ("Sun, Apr 19 2026") when the server ran in UTC while the client was
 * ahead of UTC.
 *
 * The fix is straightforward: for `YYYY-MM-DD` strings, always parse to
 * LOCAL midnight, never UTC. Then every downstream `format(date, …)` call
 * in the same runtime renders the same calendar date the string named.
 *
 * Rule of thumb:
 *   - Use `parseIsoDateLocal` for anything that looks like `YYYY-MM-DD`
 *     (shift dates, month starts, URL params, DB date columns).
 *   - Keep `parseISO` for full ISO datetime strings that carry their own
 *     time + timezone (punch_time, created_at, audit-log timestamps).
 */

/**
 * Parse a `YYYY-MM-DD` string as local midnight on that calendar date.
 *
 * Invariant:
 *   `formatIsoDateLocal(parseIsoDateLocal(iso)) === iso`
 * for every well-formed `YYYY-MM-DD` input, in every timezone.
 */
export function parseIsoDateLocal(iso: string): Date {
  const [yearStr, monthStr, dayStr] = iso.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    // Fail loudly rather than returning an "Invalid Date" sentinel — callers
    // already validate before reaching us via `isValidIsoDate` when needed.
    throw new RangeError(`parseIsoDateLocal: expected YYYY-MM-DD, got "${iso}"`);
  }
  return new Date(year, month - 1, day);
}

/**
 * Serialize a Date to `YYYY-MM-DD` using its LOCAL components, so the
 * round-trip with `parseIsoDateLocal` is lossless.
 */
export function formatIsoDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Lightweight validation — true when `iso` is a well-formed date-only
 * string AND parses to a real calendar date. Use in front of
 * `parseIsoDateLocal` when the input is untrusted (URL param, user input).
 */
export function isValidIsoDate(iso: string | undefined | null): iso is string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [yearStr, monthStr, dayStr] = iso.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

/**
 * Today's calendar date in the runtime's local timezone as a `YYYY-MM-DD`
 * string. On the server this is the server's local date; on the client,
 * the user's local date. When the two disagree (e.g. server in UTC,
 * client in UTC+8, current time around the UTC-midnight boundary) the
 * URL-supplied `?date=` param is the authoritative input for downstream
 * queries; `todayIsoLocal()` is only a fallback default.
 */
export function todayIsoLocal(): string {
  return formatIsoDateLocal(new Date());
}

/**
 * Return the ISO date-only string for the first day of the same calendar
 * month as `iso`. Useful for clamping a URL `?month=YYYY-MM-DD` input to
 * a month-start key before passing it to downstream queries.
 */
export function monthStartIsoLocal(iso: string): string {
  const d = parseIsoDateLocal(iso);
  return formatIsoDateLocal(new Date(d.getFullYear(), d.getMonth(), 1));
}

/**
 * nuqs parser for local-tz ISO date-only strings. Use in place of
 * `parseAsIsoDate` anywhere the URL value represents a calendar date
 * (not a full instant). Guarantees the `parseAsIsoDateLocal(serialize(x))`
 * round-trip is lossless in every timezone.
 *
 * Implemented inline rather than importing `createParser` from nuqs to
 * keep this module a zero-dep utility — the parser shape matches nuqs's
 * interface exactly (parse, serialize, eq).
 */
export const parseAsIsoDateLocal = {
  parse(raw: string): Date | null {
    return isValidIsoDate(raw) ? parseIsoDateLocal(raw) : null;
  },
  serialize(date: Date): string {
    return formatIsoDateLocal(date);
  },
  eq(a: Date, b: Date): boolean {
    return formatIsoDateLocal(a) === formatIsoDateLocal(b);
  },
};
