import { z } from "zod";

import { MACADDR_REGEX } from "@/features/maintenance/constants";

/**
 * Shared shape for create + update on `maintenance_orders`. Mirrors the
 * spec form fields (frontend_spec.md:2689) and the table check at
 * init_schema.sql:3595 (`maintenance_start < maintenance_end`).
 *
 * The base fields model the "remote" topology — sponsor/switch_port/
 * network_group are nullable. The shared `refineOrderShape` below
 * rejects onsite payloads that omit the sponsor and any payload whose
 * end is not strictly after start.
 */

const baseFields = {
  topology: z.enum(["remote", "onsite"]),
  targetDeviceId: z.guid({ message: "Target device is required" }),
  vendorId: z.guid({ message: "Vendor is required" }),
  // datetime-local inputs emit `YYYY-MM-DDTHH:mm` (no timezone). The
  // server treats it as the user's local time per JS `new Date(string)`.
  maintenanceStart: z
    .string()
    .min(1, "Start time is required")
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Invalid start time"),
  maintenanceEnd: z
    .string()
    .min(1, "End time is required")
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Invalid end time"),
  madLimitMinutes: z
    .number({ message: "Access limit is required" })
    .int("Must be a whole number")
    .positive("Must be greater than zero"),
  scope: z.string().trim().max(2000).nullable(),
  sponsorId: z.guid().nullable(),
  switchPort: z.string().trim().max(64).nullable(),
  networkGroup: z.string().trim().max(64).nullable(),
  vendorMacAddress: z
    .string()
    .regex(MACADDR_REGEX, "Format: AA:BB:CC:DD:EE:FF")
    .nullable(),
} as const;

type OrderShape = {
  topology: "remote" | "onsite";
  maintenanceStart: string;
  maintenanceEnd: string;
  sponsorId: string | null;
};

function refineOrderShape(value: OrderShape, ctx: z.RefinementCtx): void {
  if (new Date(value.maintenanceStart) >= new Date(value.maintenanceEnd)) {
    ctx.addIssue({
      code: "custom",
      path: ["maintenanceEnd"],
      message: "End must be after start",
    });
  }
  if (value.topology === "onsite" && !value.sponsorId) {
    ctx.addIssue({
      code: "custom",
      path: ["sponsorId"],
      message: "Sponsor is required for on-site work",
    });
  }
}

export const createOrderSchema = z.object(baseFields).superRefine(refineOrderShape);
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const updateOrderSchema = z
  .object({ id: z.guid(), ...baseFields })
  .superRefine(refineOrderShape);
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;

export const completeOrderSchema = z.object({
  id: z.guid(),
  sponsorRemark: z.string().trim().min(1, "Note required").max(2000),
});
export type CompleteOrderInput = z.infer<typeof completeOrderSchema>;

export const cancelOrderSchema = z.object({
  id: z.guid(),
  reason: z.string().trim().min(1, "Reason required").max(2000),
});
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
