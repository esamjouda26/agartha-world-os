import { z } from "zod";

/**
 * Zod schema for create/update on `movement_types`. The `code` column
 * is UNIQUE (init_schema.sql:2498); the action surfaces a 23505 unique-
 * violation as a field error.
 *
 * Direction enum mirrors the CHECK at init_schema.sql:2501.
 *
 * Optional accounting fields (`auto_reverse_code`, `debit_account_rule`,
 * `credit_account_rule`) are intentionally omitted from this surface
 * for v1 simplicity — they are managed separately when the accounting
 * sub-system is wired.
 */
const codePattern = /^[A-Za-z0-9_-]+$/;

export const upsertMovementTypeSchema = z.object({
  /** Present for update, absent for create. */
  id: z.guid().nullable(),
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(20, "Code too long")
    .regex(
      codePattern,
      "Letters, digits, underscores, and hyphens only",
    ),
  name: z.string().trim().min(1, "Name is required").max(100, "Name too long"),
  description: z
    .string()
    .trim()
    .max(500, "Description too long")
    .nullable(),
  direction: z.enum(["in", "out", "transfer", "neutral"]),
  requiresSourceDoc: z.boolean(),
  requiresCostCenter: z.boolean(),
  isActive: z.boolean(),
});

export type UpsertMovementTypeInput = z.infer<
  typeof upsertMovementTypeSchema
>;
