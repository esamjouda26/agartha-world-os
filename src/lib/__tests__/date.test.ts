import { describe, expect, it } from "vitest";

import { formatHumanDate, formatHumanDateShort, formatHumanTime } from "@/lib/date";

// ---------------------------------------------------------------------------
// formatHumanDate
// ---------------------------------------------------------------------------
describe("formatHumanDate", () => {
  it("returns null for null input", () => {
    expect(formatHumanDate(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(formatHumanDate(undefined)).toBeNull();
  });

  it("formats a valid ISO date with weekday, month, day, and year", () => {
    const result = formatHumanDate("2026-05-05");
    // Intl output may vary by ICU version; assert key fragments.
    expect(result).toContain("May");
    expect(result).toContain("5");
    expect(result).toContain("2026");
  });

  it("formats Jan 1 correctly", () => {
    const result = formatHumanDate("2026-01-01");
    expect(result).toContain("Jan");
    expect(result).toContain("1");
    expect(result).toContain("2026");
  });

  it("throws on a malformed ISO string", () => {
    expect(() => formatHumanDate("not-a-date")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// formatHumanDateShort
// ---------------------------------------------------------------------------
describe("formatHumanDateShort", () => {
  it("returns null for null input", () => {
    expect(formatHumanDateShort(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(formatHumanDateShort(undefined)).toBeNull();
  });

  it("formats a valid ISO date WITHOUT a year", () => {
    const result = formatHumanDateShort("2026-05-05");
    expect(result).toContain("May");
    expect(result).toContain("5");
    // No year in the short variant.
    expect(result).not.toContain("2026");
  });

  it("throws on a malformed ISO string", () => {
    expect(() => formatHumanDateShort("garbage")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// formatHumanTime
// ---------------------------------------------------------------------------
describe("formatHumanTime", () => {
  it("returns null for null input", () => {
    expect(formatHumanTime(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(formatHumanTime(undefined)).toBeNull();
  });

  it("formats morning time correctly (HH:MM:SS)", () => {
    expect(formatHumanTime("10:30:00")).toBe("10:30 am");
  });

  it("formats afternoon time correctly", () => {
    expect(formatHumanTime("13:05:00")).toBe("1:05 pm");
  });

  it("formats midnight as 12:00 am", () => {
    expect(formatHumanTime("00:00:00")).toBe("12:00 am");
  });

  it("formats noon as 12:00 pm", () => {
    expect(formatHumanTime("12:00:00")).toBe("12:00 pm");
  });

  it("handles HH:MM two-segment form", () => {
    expect(formatHumanTime("09:15")).toBe("9:15 am");
  });

  it("returns null for non-numeric input", () => {
    expect(formatHumanTime("abc:def:ghi")).toBeNull();
  });

  it("handles single-digit minutes with padding", () => {
    expect(formatHumanTime("14:05:00")).toBe("2:05 pm");
  });
});
