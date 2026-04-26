import { z } from "zod";

/**
 * Shared shape for create + update on `maintenance_vendors`
 * (init_schema.sql:3555). Spec form fields per frontend_spec.md:2728.
 */
const baseFields = {
  name: z.string().trim().min(1, "Name is required").max(120),
  contactEmail: z.email("Invalid email").nullable(),
  contactPhone: z.string().trim().max(40).nullable(),
  specialization: z.string().trim().max(120).nullable(),
  description: z.string().trim().max(2000).nullable(),
  isActive: z.boolean(),
} as const;

export const createVendorSchema = z.object(baseFields);
export type CreateVendorInput = z.infer<typeof createVendorSchema>;

export const updateVendorSchema = z.object({ id: z.guid(), ...baseFields });
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;

export const deleteVendorSchema = z.object({ id: z.guid() });
export type DeleteVendorInput = z.infer<typeof deleteVendorSchema>;
