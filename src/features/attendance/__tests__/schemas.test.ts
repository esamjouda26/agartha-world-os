import { describe, expect, it } from "vitest";

import {
  clockMutationSchema,
  justifyExceptionSchema,
  rejectClarificationSchema,
  submitClarificationSchema,
} from "@/features/attendance/schemas/clock";
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

describe("submitClarificationSchema", () => {
  const baseId = "5a4f0d7a-37c9-42f1-9bb8-0c7b9e2a22aa";

  it("accepts a reasonable clarification with no attachments", () => {
    const result = submitClarificationSchema.safeParse({
      exceptionId: baseId,
      text: "Was stuck in traffic on the highway.",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.attachmentPaths).toEqual([]);
    }
  });

  it("accepts attachment paths", () => {
    const result = submitClarificationSchema.safeParse({
      exceptionId: baseId,
      text: "MC attached.",
      attachmentPaths: ["aaa/bbb/ccc.pdf", "aaa/bbb/ddd.webp"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects more than 5 attachments", () => {
    const result = submitClarificationSchema.safeParse({
      exceptionId: baseId,
      text: "Six attachments.",
      attachmentPaths: Array.from({ length: 6 }, (_, i) => `p/${i}.pdf`),
    });
    expect(result.success).toBe(false);
  });

  it("rejects text below minimum length", () => {
    const result = submitClarificationSchema.safeParse({ exceptionId: baseId, text: "a" });
    expect(result.success).toBe(false);
  });

  it("rejects text above CLARIFICATION_MAX_LEN", () => {
    const result = submitClarificationSchema.safeParse({
      exceptionId: baseId,
      text: "x".repeat(CLARIFICATION_MAX_LEN + 1),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-UUID exception id", () => {
    const result = submitClarificationSchema.safeParse({ exceptionId: "nope", text: "okay now" });
    expect(result.success).toBe(false);
  });
});

describe("rejectClarificationSchema", () => {
  const baseId = "5a4f0d7a-37c9-42f1-9bb8-0c7b9e2a22bb";

  it("accepts a reasonable rejection reason", () => {
    const result = rejectClarificationSchema.safeParse({
      exceptionId: baseId,
      reason: "Missing supporting document.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty reason", () => {
    const result = rejectClarificationSchema.safeParse({ exceptionId: baseId, reason: "" });
    expect(result.success).toBe(false);
  });
});

describe("justifyExceptionSchema", () => {
  const baseId = "5a4f0d7a-37c9-42f1-9bb8-0c7b9e2a22cc";

  it("accepts a reasonable justification reason", () => {
    const result = justifyExceptionSchema.safeParse({
      exceptionId: baseId,
      reason: "MC verified.",
    });
    expect(result.success).toBe(true);
  });
});
