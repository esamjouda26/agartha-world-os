import { z } from "zod";

import { RECONCILIATION_MAX_ITEMS } from "@/features/inventory/constants";

/**
 * Zod schema for scheduling a stock reconciliation
 * (`/management/inventory/reconciliation` create form, WF-11).
 *
 * `scheduledDate` is `YYYY-MM-DD` (DATE column in `inventory_reconciliations`,
 * init_schema.sql:2804).
 * `scheduledTime` is `HH:MM` (TIME column, init_schema.sql:2805 — Postgres
 *   TIME accepts `HH:MM` and pads seconds).
 */
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const scheduleReconciliationSchema = z.object({
  locationId: z.guid({ error: "Select a location" }),
  scheduledDate: z
    .string()
    .regex(datePattern, "Use YYYY-MM-DD")
    .min(1, "Required"),
  scheduledTime: z
    .string()
    .regex(timePattern, "Use HH:MM")
    .min(1, "Required"),
  assignedToId: z.guid({ error: "Pick a runner" }),
  managerRemark: z.string().trim().max(500, "Note too long").nullable(),
  /** UUIDs of materials to count. system_qty snapshot is captured server-side. */
  materialIds: z
    .array(z.guid())
    .min(1, "Add at least one material")
    .max(
      RECONCILIATION_MAX_ITEMS,
      `Up to ${RECONCILIATION_MAX_ITEMS} materials per count`,
    ),
  idempotencyKey: z.string().uuid().optional(),
});

export type ScheduleReconciliationInput = z.infer<
  typeof scheduleReconciliationSchema
>;
