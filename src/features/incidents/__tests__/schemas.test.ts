import { describe, expect, it } from "vitest";

import { createIncidentSchema, resolveIncidentSchema } from "@/features/incidents/schemas/incident";

const uuid = "00000000-0000-4000-8000-000000000001";

describe("createIncidentSchema", () => {
  const base = {
    category: "medical_emergency" as const,
    description: "Guest fainted near the carousel — medic dispatched.",
    zoneId: uuid,
    attachmentPath: null as string | null,
  };

  it("accepts a well-formed payload", () => {
    expect(createIncidentSchema.safeParse(base).success).toBe(true);
  });

  it("accepts null zoneId", () => {
    expect(createIncidentSchema.safeParse({ ...base, zoneId: null }).success).toBe(true);
  });

  it("rejects unknown category", () => {
    expect(createIncidentSchema.safeParse({ ...base, category: "not-a-category" }).success).toBe(
      false,
    );
  });

  it("rejects a description shorter than 5 chars", () => {
    expect(createIncidentSchema.safeParse({ ...base, description: "hi" }).success).toBe(false);
  });

  it("accepts a seed-style (non-v4) zone id (z.guid)", () => {
    expect(
      createIncidentSchema.safeParse({
        ...base,
        zoneId: "d3000000-0000-0000-0000-000000000001",
      }).success,
    ).toBe(true);
  });
});

describe("resolveIncidentSchema", () => {
  it("accepts a valid id + notes", () => {
    expect(
      resolveIncidentSchema.safeParse({ id: uuid, notes: "Cleared; guest escorted home." }).success,
    ).toBe(true);
  });

  it("rejects empty notes", () => {
    expect(resolveIncidentSchema.safeParse({ id: uuid, notes: "" }).success).toBe(false);
  });
});
