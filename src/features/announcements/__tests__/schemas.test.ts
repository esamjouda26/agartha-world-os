import { describe, expect, it } from "vitest";

import {
  createAnnouncementSchema,
  deleteAnnouncementSchema,
  markAsReadSchema,
  targetSchema,
  updateAnnouncementSchema,
} from "@/features/announcements/schemas/announcement";

const validUuid = "00000000-0000-4000-8000-000000000001";

describe("targetSchema", () => {
  it("accepts a global target", () => {
    expect(targetSchema.safeParse({ target_type: "global" }).success).toBe(true);
  });

  it("accepts a role target with role_id", () => {
    expect(targetSchema.safeParse({ target_type: "role", role_id: validUuid }).success).toBe(true);
  });

  it("rejects a role target missing role_id", () => {
    expect(targetSchema.safeParse({ target_type: "role" }).success).toBe(false);
  });

  it("accepts an org_unit target with org_unit_id", () => {
    expect(
      targetSchema.safeParse({ target_type: "org_unit", org_unit_id: validUuid }).success,
    ).toBe(true);
  });

  it("accepts a user target with user_id", () => {
    expect(targetSchema.safeParse({ target_type: "user", user_id: validUuid }).success).toBe(true);
  });

  it("rejects an unknown target_type", () => {
    expect(targetSchema.safeParse({ target_type: "mystery", user_id: validUuid }).success).toBe(
      false,
    );
  });
});

describe("createAnnouncementSchema", () => {
  const base = {
    title: "Lunch order cutoff moved",
    content: "New cutoff is 11:00 AM starting Monday.",
    isPublished: true,
    expiresAt: null,
    targets: [{ target_type: "global" as const }],
  };

  it("accepts a well-formed payload", () => {
    expect(createAnnouncementSchema.safeParse(base).success).toBe(true);
  });

  it("rejects empty title", () => {
    expect(createAnnouncementSchema.safeParse({ ...base, title: "" }).success).toBe(false);
  });

  it("rejects empty targets", () => {
    expect(createAnnouncementSchema.safeParse({ ...base, targets: [] }).success).toBe(false);
  });

  it("rejects > 50 targets", () => {
    const targets = Array.from({ length: 51 }, () => ({ target_type: "global" as const }));
    expect(createAnnouncementSchema.safeParse({ ...base, targets }).success).toBe(false);
  });

  it("accepts expiresAt as ISO string", () => {
    expect(
      createAnnouncementSchema.safeParse({ ...base, expiresAt: "2026-06-01T00:00:00.000Z" })
        .success,
    ).toBe(true);
  });

  it("rejects expiresAt as non-ISO garbage", () => {
    expect(createAnnouncementSchema.safeParse({ ...base, expiresAt: "later" }).success).toBe(false);
  });
});

describe("updateAnnouncementSchema", () => {
  it("requires an id", () => {
    expect(
      updateAnnouncementSchema.safeParse({
        title: "x",
        content: "y",
        isPublished: false,
        expiresAt: null,
        targets: [{ target_type: "global" }],
      }).success,
    ).toBe(false);
  });
});

describe("markAsReadSchema / deleteAnnouncementSchema", () => {
  it("markAsReadSchema accepts a uuid", () => {
    expect(markAsReadSchema.safeParse({ announcementId: validUuid }).success).toBe(true);
  });

  it("deleteAnnouncementSchema rejects a non-uuid", () => {
    expect(deleteAnnouncementSchema.safeParse({ id: "not-a-uuid" }).success).toBe(false);
  });

  // Regression — Zod 4's `z.string().uuid()` rejects hand-crafted seed
  // IDs whose version nibble is 0 (e.g. announcements seeded in
  // init_schema). The schemas in this feature use `z.guid()` so any
  // UUID-shaped string is accepted. Locks in the fix from Session 6.
  it("markAsReadSchema accepts a non-RFC version-nibble UUID (seed-style)", () => {
    expect(
      markAsReadSchema.safeParse({ announcementId: "d3000000-0000-0000-0000-000000000001" })
        .success,
    ).toBe(true);
  });
});
