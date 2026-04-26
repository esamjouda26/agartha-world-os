import { z } from "zod";

/**
 * Zod schema for /management/marketing/promos CRUD per
 * frontend_spec.md:2585. Mirrors columns from `init_schema.sql:3729-3750`.
 *
 * `valid_days_mask` — bitmask keyed to PostgreSQL ISODOW (Mon=1, Tue=2,
 * Wed=4, Thu=8, Fri=16, Sat=32, Sun=64). NULL = all days. Schema CHECK
 * enforces 1..127 (init_schema.sql:3741); Zod mirrors that range.
 *
 * `valid_to > valid_from` is a column-level CHECK (init_schema.sql:3749).
 * The cross-field refine surfaces it as a field error so the form does
 * not 500 on the strict CHECK.
 */
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/u;

export const upsertPromoCodeSchema = z
  .object({
    id: z.guid().nullable().optional(),
    code: z
      .string()
      .trim()
      .min(2, "Required")
      .max(40, "Code too long")
      .regex(/^[A-Za-z0-9_-]+$/u, "Letters, numbers, _ and - only"),
    description: z.string().trim().max(500, "Too long").nullable(),
    discountType: z.enum(["percentage", "fixed"]),
    discountValue: z
      .number({ error: "Required" })
      .positive("Must be > 0")
      .max(1_000_000, "Out of range"),
    maxUses: z.number({ error: "Required" }).int("Whole number").positive("Must be > 0").nullable(),
    campaignId: z.guid().nullable(),
    status: z.enum(["draft", "active", "paused", "completed"]),
    validFrom: z.string().min(1, "Required"),
    validTo: z.string().min(1, "Required"),
    validDaysMask: z
      .number()
      .int("Whole number")
      .min(1, "At least one day")
      .max(127, "Out of range")
      .nullable(),
    validTimeStart: z.string().regex(TIME_REGEX, "Invalid time").nullable(),
    validTimeEnd: z.string().regex(TIME_REGEX, "Invalid time").nullable(),
    minGroupSize: z.number({ error: "Required" }).int("Whole number").min(1, "Must be ≥ 1"),
    tierIds: z.array(z.guid()).default([]),
  })
  .refine((v) => new Date(v.validFrom).getTime() < new Date(v.validTo).getTime(), {
    message: "Valid To must be after Valid From",
    path: ["validTo"],
  })
  .refine((v) => !v.validTimeStart || !v.validTimeEnd || v.validTimeStart < v.validTimeEnd, {
    message: "End time must be after start",
    path: ["validTimeEnd"],
  })
  .refine((v) => (v.validTimeStart === null) === (v.validTimeEnd === null), {
    message: "Set both times or neither",
    path: ["validTimeEnd"],
  });

export type UpsertPromoCodeInput = z.infer<typeof upsertPromoCodeSchema>;
