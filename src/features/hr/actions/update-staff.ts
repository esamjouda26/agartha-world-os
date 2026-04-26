"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { HR_ROUTER_PATHS } from "@/features/hr/cache-tags";
import { updateStaffSchema } from "@/features/hr/schemas/staff";

// ── Rate limiter ────────────────────────────────────────────────────────

const limiter = createRateLimiter({
  tokens: 100,
  window: "60 s",
  prefix: "hr-staff-update",
});

// ── Update Staff Record ─────────────────────────────────────────────────

export async function updateStaff(
  input: unknown,
): Promise<ServerActionResult<{ staffId: string }>> {
  // 1. Zod parse
  const parsed = updateStaffSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();

  // 2. AuthN + RBAC — requires hr:u
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as {
    domains?: Record<string, string[]>;
  };
  const hrAccess = appMeta.domains?.hr ?? [];
  if (!hrAccess.includes("u")) return fail("FORBIDDEN");

  // 3. Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // 4. Build update payload (only non-undefined fields)
  const d = parsed.data;
  const updates: Record<string, unknown> = { updated_by: user.id };
  if (d.legalName !== undefined) updates.legal_name = d.legalName;
  if (d.personalEmail !== undefined) updates.personal_email = d.personalEmail;
  if (d.phone !== undefined) updates.phone = d.phone || null;
  if (d.address !== undefined) updates.address = d.address || null;
  if (d.orgUnitId !== undefined) updates.org_unit_id = d.orgUnitId;
  if (d.contractStart !== undefined) updates.contract_start = d.contractStart;
  if (d.contractEnd !== undefined) updates.contract_end = d.contractEnd || null;
  if (d.kinName !== undefined) updates.kin_name = d.kinName || null;
  if (d.kinRelationship !== undefined) updates.kin_relationship = d.kinRelationship || null;
  if (d.kinPhone !== undefined) updates.kin_phone = d.kinPhone || null;

  const { error } = await supabase
    .from("staff_records")
    .update(updates as Database["public"]["Tables"]["staff_records"]["Update"])
    .eq("id", d.staffId);

  if (error) {
    const log = loggerWith({ feature: "hr", event: "update-staff", user_id: user.id });
    log.error({ error: error.message }, "failed to update staff record");
    return fail("INTERNAL");
  }

  // 5. Invalidate cache
  for (const path of HR_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }
  revalidatePath(`/[locale]/management/hr/${d.staffId}`, "page");

  after(async () => {
    const log = loggerWith({
      feature: "hr",
      event: "update-staff",
      user_id: user.id,
    });
    log.info({ staff_id: d.staffId }, "updateStaff completed");
  });

  return ok({ staffId: d.staffId });
}
