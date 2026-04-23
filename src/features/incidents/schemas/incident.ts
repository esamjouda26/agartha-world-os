import { z } from "zod";

import { CATEGORY_VALUES } from "@/features/incidents/constants";

/**
 * Zod schemas for incident mutations. Matches `public.incidents` schema
 * ([init_schema.sql:3515](../../../../supabase/migrations/20260417064731_init_schema.sql#L3515))
 * column constraints.
 *
 * `description` has no hard length in SQL (TEXT); we cap at 2000 chars
 * so the textarea doesn't devolve into free-form essays.
 */

// Spreading the tuple is what lets Zod narrow `.parse()` output to the
// exact `IncidentCategory` union that the Supabase Insert row type expects.
const incidentCategory = z.enum([...CATEGORY_VALUES]);

export const DESCRIPTION_MIN = 5;
export const DESCRIPTION_MAX = 2000;
export const RESOLUTION_NOTES_MIN = 1;
export const RESOLUTION_NOTES_MAX = 1000;

export const createIncidentSchema = z.object({
  category: incidentCategory,
  description: z
    .string()
    .trim()
    .min(DESCRIPTION_MIN, `Description must be at least ${DESCRIPTION_MIN} characters.`)
    .max(DESCRIPTION_MAX),
  /** Optional zone reference — not every incident is zone-scoped. */
  zoneId: z.guid().nullable(),
  /** Optional `operations` bucket path — assigned after the attachment
   *  upload step (if the user attached a file). */
  attachmentPath: z.string().min(1).max(500).nullable(),
});
export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;

export const resolveIncidentSchema = z.object({
  id: z.guid(),
  notes: z
    .string()
    .trim()
    .min(RESOLUTION_NOTES_MIN, "Add a brief resolution note.")
    .max(RESOLUTION_NOTES_MAX),
});
export type ResolveIncidentInput = z.infer<typeof resolveIncidentSchema>;
