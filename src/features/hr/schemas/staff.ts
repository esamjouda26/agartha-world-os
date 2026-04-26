import { z } from "zod";

/**
 * Zod schemas for HR staff mutations.
 * Used by both client-side react-hook-form and Server Action validation.
 */

/** Lenient UUID — accepts any 8-4-4-4-12 hex string (seed UUIDs don't pass strict Zod .uuid()). */
const uuidField = (msg?: string) =>
  z
    .string()
    .regex(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
      msg ?? "Invalid UUID",
    );

export const createStaffSchema = z.object({
  legalName: z.string().min(2, "Legal name must be at least 2 characters").max(255),
  personalEmail: z.string().email("Invalid email address").max(255),
  phone: z.string().min(5, "Phone number too short").max(50).optional().or(z.literal("")),
  address: z.string().max(1000).optional().or(z.literal("")),
  orgUnitId: uuidField("Select an org unit"),
  contractStart: z.string().min(1, "Contract start date is required"),
  contractEnd: z.string().optional().or(z.literal("")),
  kinName: z.string().max(255).optional().or(z.literal("")),
  kinRelationship: z.string().max(100).optional().or(z.literal("")),
  kinPhone: z.string().max(50).optional().or(z.literal("")),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;

export const updateStaffSchema = z.object({
  staffId: uuidField(),
  legalName: z.string().min(2).max(255).optional(),
  personalEmail: z.string().email().max(255).optional(),
  phone: z.string().max(50).optional().or(z.literal("")),
  address: z.string().max(1000).optional().or(z.literal("")),
  orgUnitId: uuidField().optional(),
  contractStart: z.string().optional(),
  contractEnd: z.string().optional().or(z.literal("")),
  kinName: z.string().max(255).optional().or(z.literal("")),
  kinRelationship: z.string().max(100).optional().or(z.literal("")),
  kinPhone: z.string().max(50).optional().or(z.literal("")),
});

export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
