"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { HR_ROUTER_PATHS } from "@/features/hr/cache-tags";
import { createStaffSchema } from "@/features/hr/schemas/staff";

// ── Rate limiter ────────────────────────────────────────────────────────

const limiter = createRateLimiter({
  tokens: 100,
  window: "60 s",
  prefix: "hr-staff",
});

// ── Create Staff ────────────────────────────────────────────────────────

/**
 * Create a new staff record — 8-step pipeline per prompt.md.
 *
 * INSERT staff_records → trigger `trg_auto_create_iam_request` fires →
 * INSERT iam_requests (request_type = 'provisioning', status = 'pending_it').
 */
export async function createStaff(
  input: unknown,
): Promise<ServerActionResult<{ staffRecordId: string }>> {
  // 1. Zod parse
  const parsed = createStaffSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();

  // 2. AuthN + RBAC — requires hr:c
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as {
    domains?: Record<string, string[]>;
  };
  const hrAccess = appMeta.domains?.hr ?? [];
  if (!hrAccess.includes("c")) return fail("FORBIDDEN");

  // 3. Rate limit
  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // 4. Execute mutation
  const d = parsed.data;
  const { data: record, error } = await supabase
    .from("staff_records")
    .insert({
      legal_name: d.legalName,
      personal_email: d.personalEmail,
      phone: d.phone || null,
      address: d.address || null,
      org_unit_id: d.orgUnitId,
      contract_start: d.contractStart,
      contract_end: d.contractEnd || null,
      kin_name: d.kinName || null,
      kin_relationship: d.kinRelationship || null,
      kin_phone: d.kinPhone || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !record) {
    const log = loggerWith({ feature: "hr", event: "create-staff", user_id: user.id });
    log.error(
      { error: error?.message, code: error?.code, details: error?.details, hint: error?.hint },
      "failed to create staff record",
    );
    return fail("INTERNAL");
  }

  // 5. Invalidate cache — surgical per ADR-0006
  for (const path of HR_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "hr",
      event: "create-staff",
      user_id: user.id,
    });
    log.info({ staff_record_id: record.id }, "createStaff completed");
  });

  return ok({ staffRecordId: record.id });
}
