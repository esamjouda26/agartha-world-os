import { z } from "zod";

const uuid = z.guid();

// ltree label: alphanumeric + underscore only, per PostgreSQL ltree spec
const ltreeLabel = z
  .string()
  .min(1, "Code is required")
  .max(63)
  .regex(/^[A-Za-z0-9_]+$/, "Code may only contain letters, numbers, and underscores");

const UNIT_TYPES = ["company", "division", "department"] as const;

export const createOrgUnitSchema = z.object({
  code: ltreeLabel,
  name: z.string().min(1, "Name is required").max(255),
  unitType: z.enum(UNIT_TYPES),
  parentId: uuid.optional(),
  isActive: z.boolean(),
});
export type CreateOrgUnitInput = z.infer<typeof createOrgUnitSchema>;

export const updateOrgUnitSchema = z.object({
  id: uuid,
  name: z.string().min(1, "Name is required").max(255),
  unitType: z.enum(UNIT_TYPES),
  isActive: z.boolean(),
  // Note: code and path/parent changes are NOT supported without the
  // reparent_org_unit RPC (which does not exist in migrations).
});
export type UpdateOrgUnitInput = z.infer<typeof updateOrgUnitSchema>;
