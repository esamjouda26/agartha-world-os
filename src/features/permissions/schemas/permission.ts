import { z } from "zod";

const uuid = z.guid();
const ACCESS_LEVELS = ["admin", "manager", "crew"] as const;

export const createRoleSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100)
    .regex(/^[a-z_]+$/, "Lowercase letters and underscores only"),
  displayName: z.string().min(1, "Display name is required").max(255),
  accessLevel: z.enum(ACCESS_LEVELS),
});
export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  id: uuid,
  displayName: z.string().min(1, "Display name is required").max(255),
  accessLevel: z.enum(ACCESS_LEVELS),
});
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

export const upsertPermissionSchema = z.object({
  roleId: uuid,
  domainId: uuid,
  canCreate: z.boolean(),
  canRead: z.boolean(),
  canUpdate: z.boolean(),
  canDelete: z.boolean(),
});
export type UpsertPermissionInput = z.infer<typeof upsertPermissionSchema>;
