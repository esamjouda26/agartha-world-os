import { describe, expect, it } from "vitest";

import {
  deleteScheduleSchema,
  generateReportSchema,
  parametersSchema,
  saveScheduleSchema,
  toggleScheduleActiveSchema,
} from "@/features/reports/schemas/report";

const uuid = "00000000-0000-4000-8000-000000000001";

describe("parametersSchema", () => {
  it("accepts a preset-only payload", () => {
    expect(
      parametersSchema.safeParse({
        date_range: { preset: "last_7_days", from: null, to: null },
        extras: {},
      }).success,
    ).toBe(true);
  });

  it("accepts a well-formed custom range", () => {
    expect(
      parametersSchema.safeParse({
        date_range: { preset: "custom", from: "2026-04-01", to: "2026-04-30" },
        extras: { location_id: "x" },
      }).success,
    ).toBe(true);
  });

  it("rejects custom with missing from/to", () => {
    expect(
      parametersSchema.safeParse({
        date_range: { preset: "custom", from: null, to: null },
        extras: {},
      }).success,
    ).toBe(false);
  });

  it("rejects reversed custom range", () => {
    expect(
      parametersSchema.safeParse({
        date_range: { preset: "custom", from: "2026-05-01", to: "2026-04-01" },
        extras: {},
      }).success,
    ).toBe(false);
  });
});

describe("generateReportSchema", () => {
  it("accepts a valid payload", () => {
    expect(
      generateReportSchema.safeParse({
        reportType: "daily_sales",
        parameters: {
          date_range: { preset: "today", from: null, to: null },
          extras: {},
        },
      }).success,
    ).toBe(true);
  });

  it("rejects unknown report_type", () => {
    expect(
      generateReportSchema.safeParse({
        reportType: "not_a_report",
        parameters: { date_range: { preset: "today", from: null, to: null }, extras: {} },
      }).success,
    ).toBe(false);
  });
});

describe("saveScheduleSchema", () => {
  const base = {
    id: null as string | null,
    reportType: "monthly_timesheet" as const,
    parameters: {
      date_range: { preset: "last_30_days" as const, from: null, to: null },
      extras: {},
    },
    scheduleCron: "0 6 1 * *",
    recipients: ["alex@parkops.com"],
    isActive: true,
  };

  it("accepts a well-formed schedule", () => {
    expect(saveScheduleSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a cron with wrong field count", () => {
    expect(saveScheduleSchema.safeParse({ ...base, scheduleCron: "0 6 *" }).success).toBe(false);
  });

  it("rejects invalid recipient emails", () => {
    expect(saveScheduleSchema.safeParse({ ...base, recipients: ["not-an-email"] }).success).toBe(
      false,
    );
  });

  it("rejects > 20 recipients", () => {
    const recipients = Array.from({ length: 21 }, (_, i) => `user${i}@parkops.com`);
    expect(saveScheduleSchema.safeParse({ ...base, recipients }).success).toBe(false);
  });

  it("accepts an edit with a uuid id", () => {
    expect(saveScheduleSchema.safeParse({ ...base, id: uuid }).success).toBe(true);
  });
});

describe("deleteScheduleSchema / toggleScheduleActiveSchema", () => {
  it("deleteScheduleSchema accepts a uuid", () => {
    expect(deleteScheduleSchema.safeParse({ id: uuid }).success).toBe(true);
  });

  it("toggleScheduleActiveSchema requires boolean isActive", () => {
    expect(toggleScheduleActiveSchema.safeParse({ id: uuid, isActive: "true" }).success).toBe(
      false,
    );
    expect(toggleScheduleActiveSchema.safeParse({ id: uuid, isActive: true }).success).toBe(true);
  });
});
