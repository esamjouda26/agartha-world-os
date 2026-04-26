import { z } from "zod";

/**
 * Zod schema for price_list create/edit form.
 *
 * Schema ref: init_schema.sql:2264 — price_lists
 * RLS: INSERT pos:c, UPDATE pos:u (init_schema.sql:2420-2424)
 *
 * Dates are submitted as YYYY-MM-DD strings (matches DB DATE columns).
 * No .default() — avoids input/output mismatch with exactOptionalPropertyTypes.
 */
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const upsertPriceListSchema = z
  .object({
    id: z.guid().optional(),
    name: z.string().min(1, "Name is required").max(200),
    currency: z.string().min(1).max(3),
    validFrom: dateString,
    validTo: dateString.optional().or(z.literal("")),
    isDefault: z.boolean(),
  })
  .refine(
    (d) => !d.validTo || d.validTo === "" || d.validTo >= d.validFrom,
    { message: "End date must be on/after start date", path: ["validTo"] },
  );

export type UpsertPriceListInput = z.infer<typeof upsertPriceListSchema>;
