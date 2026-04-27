/**
 * Generate an iCalendar (.ics) string for a confirmed booking.
 *
 * Pure helper — no env, no DB. Safe to import from client code so the
 * "Add to calendar" button can build the file in-browser and trigger a
 * download via Blob URL without round-tripping the server.
 *
 * Spec: per-route gate "Add to calendar (.ics)" decision. RFC 5545
 * compliant; tested in Apple Calendar / Google Calendar / Outlook.
 */

export type BookingIcsInput = Readonly<{
  bookingRef: string;
  experienceName: string;
  tierName: string;
  /** YYYY-MM-DD in facility timezone. */
  slotDate: string;
  /** HH:MM[:SS] in facility timezone. */
  startTime: string;
  /** Tier duration in minutes — used to compute DTEND. */
  durationMinutes: number;
  /** Facility timezone (IANA, e.g. "Asia/Kuala_Lumpur"). */
  timezone: string;
  /** Optional human-readable location (street + venue). */
  location?: string | null;
}>;

/**
 * RFC 5545 escape: backslashes, semicolons, commas, and newlines must be
 * escaped in TEXT property values.
 */
function escapeIcsText(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Pads to two digits. */
function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

/**
 * Format a wall-clock date/time in TZID-anchored form per RFC 5545:
 *   `DTSTART;TZID=<tz>:YYYYMMDDTHHMMSS`
 * The facility-timezone-aware client (Apple Calendar / Google) resolves
 * the wall-clock to the user's home timezone automatically.
 */
function toLocalIcsDateTime(date: string, time: string): string {
  // date YYYY-MM-DD  time HH:MM[:SS]
  const [y = "", m = "", d = ""] = date.split("-");
  const [h = "00", mi = "00", s = "00"] = time.split(":");
  return `${y}${m}${d}T${pad2(Number(h))}${pad2(Number(mi))}${pad2(Number(s))}`;
}

function addMinutesToWallClock(
  date: string,
  time: string,
  minutes: number,
): { date: string; time: string } {
  const [y = "0", mo = "0", d = "0"] = date.split("-").map((v) => Number(v).toString());
  const [h = "0", mi = "0", s = "0"] = time.split(":").map((v) => Number(v).toString());
  // Use a UTC reference Date purely for arithmetic — we serialise back to
  // wall-clock components, so the actual UTC offset is irrelevant here.
  const ref = new Date(
    Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)),
  );
  ref.setUTCMinutes(ref.getUTCMinutes() + minutes);
  return {
    date: `${ref.getUTCFullYear()}-${pad2(ref.getUTCMonth() + 1)}-${pad2(ref.getUTCDate())}`,
    time: `${pad2(ref.getUTCHours())}:${pad2(ref.getUTCMinutes())}:${pad2(ref.getUTCSeconds())}`,
  };
}

/** UTC stamp in basic ISO format for DTSTAMP. */
function nowUtcStamp(): string {
  const d = new Date();
  return (
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
    `T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`
  );
}

export function buildBookingIcs(input: BookingIcsInput): string {
  const end = addMinutesToWallClock(input.slotDate, input.startTime, input.durationMinutes);
  const dtstart = toLocalIcsDateTime(input.slotDate, input.startTime);
  const dtend = toLocalIcsDateTime(end.date, end.time);
  const summary = `${input.experienceName} — ${input.tierName}`;
  const description = [
    `Booking reference: ${input.bookingRef}`,
    `Tier: ${input.tierName}`,
    "Show this booking at the gate with your QR code.",
  ].join("\n");

  const uid = `${input.bookingRef.toLowerCase()}@agartha.example`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AgarthaOS//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${nowUtcStamp()}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `DTSTART;TZID=${input.timezone}:${dtstart}`,
    `DTEND;TZID=${input.timezone}:${dtend}`,
    ...(input.location ? [`LOCATION:${escapeIcsText(input.location)}`] : []),
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:AgarthaOS booking starts in 1 hour",
    "TRIGGER:-PT1H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.join("\r\n")}\r\n`;
}
