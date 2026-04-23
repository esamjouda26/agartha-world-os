import { z } from "zod";

/**
 * Zod schemas for announcement mutations.
 *
 * Shape matches `rpc_create_announcement` / `rpc_update_announcement`
 * parameter contracts ([20260422140000_add_announcement_crud_rpcs.sql](../../../../supabase/migrations/20260422140000_add_announcement_crud_rpcs.sql))
 * and the `announcement_targets` CHECK constraint
 * ([init_schema.sql:3833-3838](../../../../supabase/migrations/20260417064731_init_schema.sql#L3833)).
 *
 * `target_type` is the `announcement_target_type` enum
 * ([init_schema.sql:111](../../../../supabase/migrations/20260417064731_init_schema.sql#L111)).
 * Per the CHECK constraint, exactly one of `role_id` / `org_unit_id` /
 * `user_id` must be populated for the matching `target_type` (and all
 * three are null for `global`). We model each target variant as a
 * discriminated union so TS catches wrong-shape rows at compile time.
 */

export const TITLE_MIN = 1;
export const TITLE_MAX = 200;
export const CONTENT_MIN = 1;
export const CONTENT_MAX = 10_000;
export const MAX_TARGETS_PER_ANNOUNCEMENT = 50;

// Zod 4's `z.string().uuid()` enforces strict RFC-9562 v1-8 UUIDs and
// rejects hand-crafted seed IDs like `d3000000-0000-0000-...` (version
// nibble 0). Postgres's UUID type stores any 36-char hex pattern, so we
// use `z.guid()` for shape validation only — the DB FK + UUID column
// remain the authoritative format check.
const uuid = z.guid();

const targetGlobalSchema = z.object({
  target_type: z.literal("global"),
});
const targetRoleSchema = z.object({
  target_type: z.literal("role"),
  role_id: uuid,
});
const targetOrgUnitSchema = z.object({
  target_type: z.literal("org_unit"),
  org_unit_id: uuid,
});
const targetUserSchema = z.object({
  target_type: z.literal("user"),
  user_id: uuid,
});

export const targetSchema = z.discriminatedUnion("target_type", [
  targetGlobalSchema,
  targetRoleSchema,
  targetOrgUnitSchema,
  targetUserSchema,
]);
export type AnnouncementTarget = z.infer<typeof targetSchema>;

const baseFields = {
  title: z.string().trim().min(TITLE_MIN, "Title is required.").max(TITLE_MAX),
  content: z.string().trim().min(CONTENT_MIN, "Content is required.").max(CONTENT_MAX),
  isPublished: z.boolean(),
  /** ISO-8601 string or null — RSCs serialize DB timestamps as strings. */
  expiresAt: z.string().datetime().nullable(),
  targets: z
    .array(targetSchema)
    .min(1, "Add at least one audience target.")
    .max(MAX_TARGETS_PER_ANNOUNCEMENT),
};

export const createAnnouncementSchema = z.object(baseFields);
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

export const updateAnnouncementSchema = z.object({
  id: uuid,
  ...baseFields,
});
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;

export const deleteAnnouncementSchema = z.object({ id: uuid });
export type DeleteAnnouncementInput = z.infer<typeof deleteAnnouncementSchema>;

export const markAsReadSchema = z.object({ announcementId: uuid });
export type MarkAsReadInput = z.infer<typeof markAsReadSchema>;
