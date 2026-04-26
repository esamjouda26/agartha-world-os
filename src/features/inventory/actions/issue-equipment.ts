"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { INVENTORY_ROUTER_PATHS } from "@/features/inventory/cache-tags";
import {
  EQUIPMENT_CUSTODY_RATE_TOKENS,
  EQUIPMENT_CUSTODY_RATE_WINDOW,
} from "@/features/inventory/constants";
import { issueEquipmentSchema } from "@/features/inventory/schemas/issue-equipment";

const limiter = createRateLimiter({
  tokens: EQUIPMENT_CUSTODY_RATE_TOKENS,
  window: EQUIPMENT_CUSTODY_RATE_WINDOW,
  prefix: "inventory-issue-equipment",
});

/**
 * Issue a returnable asset to a staff member (WF-20 issuance).
 *
 * Action gate `inventory_ops:c` mirrors RLS INSERT policy
 * (init_schema.sql:2957). Server cross-checks `materials.is_returnable
 * = TRUE` before insert — only returnable items enter the custody
 * ledger.
 */
export async function issueEquipment(
  input: unknown,
): Promise<ServerActionResult<{ assignmentId: string }>> {
  // 1. Zod parse
  const parsed = issueEquipmentSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();

  // 2. AuthN + RBAC
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as {
    domains?: Record<string, string[]>;
  };
  if (!appMeta.domains?.inventory_ops?.includes("c")) {
    return fail("FORBIDDEN");
  }

  // 3. Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // 4. Cross-check: material exists and is_returnable.
  const { data: mat, error: matErr } = await supabase
    .from("materials")
    .select("id, is_returnable")
    .eq("id", parsed.data.materialId)
    .maybeSingle();
  if (matErr) {
    const log = loggerWith({
      feature: "inventory",
      event: "issue_equipment",
      user_id: user.id,
    });
    log.error(
      { code: matErr.code, message: matErr.message },
      "material lookup failed",
    );
    return fail("INTERNAL");
  }
  if (!mat) {
    return fail("VALIDATION_FAILED", {
      materialId: "Material not found.",
    });
  }
  if (mat.is_returnable !== true) {
    return fail("VALIDATION_FAILED", {
      materialId:
        "Material is not flagged as returnable — only returnable assets enter the custody ledger.",
    });
  }

  // 5. INSERT equipment_assignments
  const { data: record, error: insErr } = await supabase
    .from("equipment_assignments")
    .insert({
      material_id: parsed.data.materialId,
      assigned_to: parsed.data.assignedToId,
      // assigned_at defaults to NOW() in schema; explicit for clarity:
      assigned_at: new Date().toISOString(),
      notes: parsed.data.notes,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (insErr || !record) {
    if (insErr?.code === "23503") {
      return fail("VALIDATION_FAILED", {
        form: "Selected material or recipient is no longer available.",
      });
    }
    const log = loggerWith({
      feature: "inventory",
      event: "issue_equipment",
      user_id: user.id,
    });
    log.error(
      { code: insErr?.code, message: insErr?.message },
      "issue INSERT failed",
    );
    return fail("INTERNAL");
  }

  // 6. Invalidate cache (ADR-0006)
  for (const p of INVENTORY_ROUTER_PATHS) {
    revalidatePath(p, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "inventory",
      event: "issue_equipment",
      user_id: user.id,
    });
    log.info(
      {
        assignment_id: record.id,
        material_id: parsed.data.materialId,
        assigned_to_id: parsed.data.assignedToId,
      },
      "issueEquipment completed",
    );
  });

  return ok({ assignmentId: record.id });
}
