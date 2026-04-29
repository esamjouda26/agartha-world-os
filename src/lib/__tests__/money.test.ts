import { describe, expect, it } from "vitest";

import { formatCents, formatMoney } from "@/lib/money";

describe("formatMoney", () => {
  // -- Default MYR currency --------------------------------------------------

  it("formats a positive amount with 2 decimal places", () => {
    const result = formatMoney(227);
    expect(result).toContain("227");
    expect(result).toContain("00");
  });

  it("formats zero", () => {
    const result = formatMoney(0);
    expect(result).toContain("0");
    expect(result).toContain("00");
  });

  it("formats a negative (discount) amount", () => {
    const result = formatMoney(-50);
    // The exact format of negative currency varies by ICU version, but it
    // should contain 50.00 and some negative indicator.
    expect(result).toContain("50");
    expect(result).toMatch(/-|−|\(/); // minus sign, unicode minus, or parens
  });

  it("uses MYR as the default currency", () => {
    const result = formatMoney(100);
    // Intl may render "RM", "MYR", or "RM " depending on ICU version.
    expect(result).toMatch(/RM|MYR/);
  });

  // -- Custom currency -------------------------------------------------------

  it("formats with a custom currency code", () => {
    const result = formatMoney(227, "USD");
    // Should contain a dollar-related symbol, not RM.
    expect(result).toMatch(/\$|USD/);
    expect(result).not.toMatch(/RM/);
  });

  // -- Custom fractionDigits -------------------------------------------------

  it("renders 0 fraction digits when requested", () => {
    const result = formatMoney(227, "MYR", 0);
    // Should NOT contain ".00"
    expect(result).not.toContain(".00");
    expect(result).toContain("227");
  });

  it("renders 4 fraction digits when requested", () => {
    const result = formatMoney(227, "MYR", 4);
    expect(result).toContain("0000");
  });

  it("defaults fractionDigits to 2", () => {
    const result = formatMoney(1.5);
    expect(result).toContain("1.50");
  });
});

describe("formatCents", () => {
  it("converts cents to decimal currency (22700 → RM 227.00)", () => {
    const result = formatCents(22700);
    expect(result).toContain("227");
    expect(result).toContain(".00");
    expect(result).toMatch(/RM|MYR/);
  });

  it("formats zero cents", () => {
    const result = formatCents(0);
    expect(result).toContain("0.00");
  });

  it("formats negative cents (discount)", () => {
    const result = formatCents(-5000);
    expect(result).toContain("50");
    expect(result).toMatch(/-|−|\(/);
  });

  it("formats with a custom currency code", () => {
    const result = formatCents(22700, "USD");
    expect(result).toMatch(/\$|USD/);
    expect(result).not.toMatch(/RM/);
  });

  it("renders 0 fraction digits when requested", () => {
    const result = formatCents(22700, "MYR", 0);
    expect(result).not.toContain(".00");
    expect(result).toContain("227");
  });

  it("handles fractional cents correctly via division", () => {
    // 12345 cents = 123.45 MYR (not 123.450 or anything weird)
    const result = formatCents(12345);
    expect(result).toContain("123.45");
  });
});
