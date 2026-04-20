import { describe, expect, it } from "vitest";

import { addClarificationSchema, clockMutationSchema } from "@/features/attendance/schemas/clock";
import { CLARIFICATION_MAX_LEN } from "@/features/attendance/constants";

describe("clockMutationSchema", () => {
  const base = {
    gps: { lat: 3.1, lng: 101.7, accuracy: 12 },
    selfieUrl: "abcd/2026-04-20/clock-in-x.webp",
    remark: null,
  };

  it("accepts a well-formed payload", () => {
    const result = clockMutationSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("accepts a null gps payload (optional)", () => {
    const result = clockMutationSchema.safeParse({ ...base, gps: null });
    expect(result.success).toBe(true);
  });

  it("rejects out-of-range latitude", () => {
    const result = clockMutationSchema.safeParse({
      ...base,
      gps: { lat: 100, lng: 0, accuracy: 1 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty selfieUrl", () => {
    const result = clockMutationSchema.safeParse({ ...base, selfieUrl: "" });
    expect(result.success).toBe(false);
  });
});

describe("addClarificationSchema", () => {
  const baseId = "5a4f0d7a-37c9-42f1-9bb8-0c7b9e2a22aa";

  it("accepts a reasonable clarification", () => {
    const result = addClarificationSchema.safeParse({
      exceptionId: baseId,
      text: "Was stuck in traffic on the highway.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects text below minimum length", () => {
    const result = addClarificationSchema.safeParse({ exceptionId: baseId, text: "a" });
    expect(result.success).toBe(false);
  });

  it("rejects text above CLARIFICATION_MAX_LEN", () => {
    const result = addClarificationSchema.safeParse({
      exceptionId: baseId,
      text: "x".repeat(CLARIFICATION_MAX_LEN + 1),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-UUID exception id", () => {
    const result = addClarificationSchema.safeParse({ exceptionId: "nope", text: "okay now" });
    expect(result.success).toBe(false);
  });
});
