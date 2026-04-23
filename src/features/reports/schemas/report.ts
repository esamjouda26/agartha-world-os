import { z } from "zod";

import { DATE_RANGE_PRESETS, REPORT_TYPES } from "@/features/reports/constants";

/**
 * Zod schemas for report mutations. Matches `public.reports` schema
 * ([init_schema.sql:3919](../../../../supabase/migrations/20260417064731_init_schema.sql#L3919)).
 *
 * `parameters` is a free-form JSONB bag — the Edge Function merges it
 * into each `_report_*` sub-function's call. We validate the well-known
 * date-range shape and allow arbitrary additional keys through.
 */

const reportType = z.enum([...REPORT_TYPES]);

const dateRangeSchema = z.object({
  preset: z.enum([...DATE_RANGE_PRESETS]),
  // ISO dates — only populated when `preset = "custom"`.
  from: z.string().date().nullable(),
  to: z.string().date().nullable(),
});

export const parametersSchema = z
  .object({
    date_range: dateRangeSchema,
    extras: z.record(z.string(), z.unknown()).default({}),
  })
  .refine(
    (v) =>
      v.date_range.preset === "custom" ? Boolean(v.date_range.from && v.date_range.to) : true,
    { message: "Custom date range requires both a start and end date.", path: ["date_range"] },
  )
  .refine(
    (v) =>
      v.date_range.preset !== "custom" ||
      !v.date_range.from ||
      !v.date_range.to ||
      v.date_range.from <= v.date_range.to,
    { message: "Start date must be on or before end date.", path: ["date_range"] },
  );
export type ReportParameters = z.infer<typeof parametersSchema>;

/** One-off "generate now" — no schedule, not persisted for scheduling. */
export const generateReportSchema = z.object({
  reportType,
  parameters: parametersSchema,
});
export type GenerateReportInput = z.infer<typeof generateReportSchema>;

/** Email recipient list for scheduled reports. Capped to prevent abuse. */
const recipientsSchema = z
  .array(z.email("Enter a valid email address."))
  .max(20, "At most 20 recipients per schedule.")
  .default([]);

/** Cron expression — 5 fields (minute hour day month weekday). Light
 *  validation: must have exactly 5 whitespace-separated tokens. Full
 *  cron-syntax validation is done server-side by pg_cron if the user
 *  later wires an auto-runner. */
const cronSchema = z
  .string()
  .trim()
  .refine((v) => v.split(/\s+/).length === 5, {
    message: "Cron expression must have 5 fields (e.g. '0 9 * * 1').",
  });

export const saveScheduleSchema = z.object({
  /** `null` = new config; otherwise edit existing. */
  id: z.guid().nullable(),
  reportType,
  parameters: parametersSchema,
  scheduleCron: cronSchema,
  recipients: recipientsSchema,
  isActive: z.boolean(),
});
export type SaveScheduleInput = z.infer<typeof saveScheduleSchema>;

export const deleteScheduleSchema = z.object({ id: z.guid() });
export type DeleteScheduleInput = z.infer<typeof deleteScheduleSchema>;

export const toggleScheduleActiveSchema = z.object({
  id: z.guid(),
  isActive: z.boolean(),
});
export type ToggleScheduleActiveInput = z.infer<typeof toggleScheduleActiveSchema>;
