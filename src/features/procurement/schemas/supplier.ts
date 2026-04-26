import { z } from "zod";

const uuidField = (msg: string) =>
  z.string().min(1, msg).uuid("Must be a valid UUID");

/**
 * Spec INTERACTIONS: "Create/Edit: fields — name, contact_email, contact_phone,
 *   address, description, is_active → Server Action → INSERT/UPDATE suppliers"
 */
export const createSupplierSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  contactEmail: z.string().email("Invalid email").or(z.literal("")).optional(),
  contactPhone: z.string().max(30).optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = z.object({
  supplierId: uuidField("Supplier ID is required"),
  name: z.string().min(1, "Name is required").max(200),
  contactEmail: z.string().email("Invalid email").or(z.literal("")).optional(),
  contactPhone: z.string().max(30).optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
  isActive: z.boolean(),
});

export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
