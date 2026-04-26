import { z } from "zod";

/**
 * Leave management schemas — used by `/management/hr/attendance/leaves`.
 * All using `z.guid()` for UUID fields (see attendance-management.ts rationale).
 */

export const approveLeaveSchema = z.object({
  requestId: z.guid(),
});

export type ApproveLeaveInput = z.infer<typeof approveLeaveSchema>;

export const rejectLeaveSchema = z.object({
  requestId: z.guid(),
  rejectionReason: z
    .string()
    .min(3, "Rejection reason must be at least 3 characters.")
    .max(500, "Rejection reason must be at most 500 characters."),
});

export type RejectLeaveInput = z.infer<typeof rejectLeaveSchema>;

export const cancelLeaveSchema = z.object({
  requestId: z.guid(),
});

export type CancelLeaveInput = z.infer<typeof cancelLeaveSchema>;

export const createLedgerEntrySchema = z.object({
  staffRecordId: z.guid(),
  leaveTypeId: z.guid(),
  transactionType: z.enum(["accrual", "usage", "adjustment", "carry_forward", "forfeiture"]),
  days: z.number(),
  fiscalYear: z.number().int().gte(2020).lte(2099),
  notes: z.string().max(500).default(""),
});

export type CreateLedgerEntryInput = z.infer<typeof createLedgerEntrySchema>;

export const leaveTypeSchema = z.object({
  id: z.guid().optional(),
  code: z.string().min(1, "Code is required.").max(20),
  name: z.string().min(1, "Name is required.").max(100),
  isPaid: z.boolean(),
  isActive: z.boolean().default(true),
});

export type LeaveTypeInput = z.infer<typeof leaveTypeSchema>;

export const leavePolicySchema = z.object({
  id: z.guid().optional(),
  name: z.string().min(1, "Name is required.").max(100),
  description: z.string().max(500).default(""),
  isActive: z.boolean().default(true),
  entitlements: z.array(
    z.object({
      leaveTypeId: z.guid(),
      daysPerYear: z.number().gte(0, "Days must be >= 0."),
      frequency: z.enum(["annual_upfront", "monthly_prorated"]),
    }),
  ),
});

export type LeavePolicyInput = z.infer<typeof leavePolicySchema>;

export const deleteLeaveTypeSchema = z.object({
  id: z.guid(),
});

export type DeleteLeaveTypeInput = z.infer<typeof deleteLeaveTypeSchema>;
