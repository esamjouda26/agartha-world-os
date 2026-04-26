import { z } from "zod";

/**
 * Zod schema for /management/marketing/campaigns CRUD.
 * Mirrors columns from `init_schema.sql:3715-3727` (campaigns).
 *
 * `status` is the lifecycle_status enum (init_schema.sql:114). The
 * `budget >= 0` CHECK is enforced both at the column and here.
 *
 * `start_date` and `end_date` are DATE columns (no TZ). When both
 * provided we additionally refine end_date >= start_date — there is
 * no DB CHECK for this, but the spec describes the lifecycle as a
 * window and a reversed range produces nonsense badges.
 */
export const upsertCampaignSchema = z
  .object({
    id: z.guid().nullable().optional(),
    name: z.string().trim().min(1, "Required").max(200, "Name too long"),
    description: z.string().trim().max(2000, "Description too long").nullable(),
    status: z.enum(["draft", "active", "paused", "completed"]),
    budget: z
      .number({ error: "Required" })
      .min(0, "Must be ≥ 0")
      .max(1_000_000_000, "Out of range")
      .nullable(),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/u, "Invalid date")
      .nullable(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/u, "Invalid date")
      .nullable(),
  })
  .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, {
    message: "End must be on or after start",
    path: ["endDate"],
  });

export type UpsertCampaignInput = z.infer<typeof upsertCampaignSchema>;
