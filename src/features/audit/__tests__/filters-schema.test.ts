import { describe, expect, it } from "vitest";

import { auditFiltersSchema, decodeCursor, encodeCursor } from "@/features/audit/schemas/filters";

describe("auditFiltersSchema cursor regex", () => {
  // Postgres TIMESTAMPTZ returned via Supabase JS uses `+00:00` offset
  // form, not `Z`. Encoding the cursor straight from the row's
  // `created_at` produces this format. The schema MUST accept it; a
  // previous version only accepted `Z` and rejected every cursor we
  // round-tripped, breaking pagination with "Audit log is temporarily
  // unavailable".
  it("accepts cursors with `+00:00` offset (Supabase JS default format)", () => {
    const result = auditFiltersSchema.safeParse({
      cursor: "2026-04-18T07:24:56.820039+00:00|9e04e98d-d512-47b0-9f40-00bb89df3ebb",
    });
    expect(result.success).toBe(true);
  });

  it("accepts cursors with `Z` zulu form", () => {
    const result = auditFiltersSchema.safeParse({
      cursor: "2026-04-18T07:24:56.820039Z|9e04e98d-d512-47b0-9f40-00bb89df3ebb",
    });
    expect(result.success).toBe(true);
  });

  it("accepts cursors with non-zero offset (e.g. `+05:30`)", () => {
    const result = auditFiltersSchema.safeParse({
      cursor: "2026-04-18T12:54:56.820039+05:30|9e04e98d-d512-47b0-9f40-00bb89df3ebb",
    });
    expect(result.success).toBe(true);
  });

  it("accepts cursors without sub-second precision", () => {
    const result = auditFiltersSchema.safeParse({
      cursor: "2026-04-18T07:24:56+00:00|9e04e98d-d512-47b0-9f40-00bb89df3ebb",
    });
    expect(result.success).toBe(true);
  });

  it("rejects cursors with malformed timestamp", () => {
    const result = auditFiltersSchema.safeParse({
      cursor: "not-a-timestamp|9e04e98d-d512-47b0-9f40-00bb89df3ebb",
    });
    expect(result.success).toBe(false);
  });

  it("rejects cursors with malformed UUID", () => {
    const result = auditFiltersSchema.safeParse({
      cursor: "2026-04-18T07:24:56.820039+00:00|not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects cursors missing the `|` separator", () => {
    const result = auditFiltersSchema.safeParse({
      cursor: "2026-04-18T07:24:56.820039+00:00-9e04e98d-d512-47b0-9f40-00bb89df3ebb",
    });
    expect(result.success).toBe(false);
  });

  it("round-trips: encodeCursor → schema → decodeCursor", () => {
    const createdAt = "2026-04-18T07:24:56.820039+00:00";
    const id = "9e04e98d-d512-47b0-9f40-00bb89df3ebb";

    const encoded = encodeCursor(createdAt, id);
    const parsed = auditFiltersSchema.safeParse({ cursor: encoded });
    expect(parsed.success).toBe(true);

    const decoded = decodeCursor(encoded);
    expect(decoded).toEqual({ createdAt, id });
  });
});

describe("auditFiltersSchema pageSize", () => {
  it("accepts the four allowed sizes", () => {
    for (const size of [10, 25, 50, 100] as const) {
      const result = auditFiltersSchema.safeParse({ pageSize: size });
      expect(result.success).toBe(true);
    }
  });

  it("rejects out-of-range page sizes", () => {
    expect(auditFiltersSchema.safeParse({ pageSize: 5 }).success).toBe(false);
    expect(auditFiltersSchema.safeParse({ pageSize: 200 }).success).toBe(false);
    expect(auditFiltersSchema.safeParse({ pageSize: 100000 }).success).toBe(false);
  });

  it("treats pageSize as optional", () => {
    expect(auditFiltersSchema.safeParse({}).success).toBe(true);
  });
});
