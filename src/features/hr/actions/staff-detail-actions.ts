"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { HR_ROUTER_PATHS } from "@/features/hr/cache-tags";

// ── Schemas ─────────────────────────────────────────────────────────────

/** Lenient UUID — accepts any 8-4-4-4-12 hex string (seed UUIDs don't pass strict Zod .uuid()). */
const uuidField = (msg?: string) =>
  z
    .string()
    .regex(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
      msg ?? "Invalid UUID",
    );

const assignPolicySchema = z.object({
  staffId: uuidField(),
  leavePolicyId: uuidField("Select a leave policy"),
});

const createTransferRequestSchema = z.object({
  staffRecordId: uuidField(),
  currentRoleId: uuidField().nullable(),
  targetRoleId: uuidField("Select a target role"),
  hrRemark: z.string().max(1000).optional(),
});

// ── Rate limiter ────────────────────────────────────────────────────────

const limiter = createRateLimiter({
  tokens: 100,
  window: "60 s",
  prefix: "hr-staff-detail",
});

// ── Assign Leave Policy ─────────────────────────────────────────────────

export async function assignLeavePolicy(
  input: unknown,
): Promise<ServerActionResult<{ staffId: string }>> {
  const parsed = assignPolicySchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  const hrAccess = appMeta.domains?.hr ?? [];
  if (!hrAccess.includes("u")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const { error } = await supabase
    .from("staff_records")
    .update({
      leave_policy_id: parsed.data.leavePolicyId,
      updated_by: user.id,
    })
    .eq("id", parsed.data.staffId);

  if (error) return fail("INTERNAL");

  for (const path of HR_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }
  revalidatePath(`/[locale]/management/hr/${parsed.data.staffId}`, "page");

  after(async () => {
    const log = loggerWith({ feature: "hr", event: "assign-leave-policy", user_id: user.id });
    log.info({ staff_id: parsed.data.staffId }, "assignLeavePolicy completed");
  });

  return ok({ staffId: parsed.data.staffId });
}

// ── Create Transfer Request ─────────────────────────────────────────────

export async function createTransferRequest(
  input: unknown,
): Promise<ServerActionResult<{ requestId: string }>> {
  const parsed = createTransferRequestSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("UNAUTHENTICATED");
  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  const hrAccess = appMeta.domains?.hr ?? [];
  if (!hrAccess.includes("c")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  const d = parsed.data;
  const { data: request, error } = await supabase
    .from("iam_requests")
    .insert({
      request_type: "transfer",
      staff_record_id: d.staffRecordId,
      current_role_id: d.currentRoleId,
      target_role_id: d.targetRoleId,
      hr_remark: d.hrRemark || null,
      status: "pending_it",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !request) return fail("INTERNAL");

  for (const path of HR_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const log = loggerWith({ feature: "hr", event: "create-transfer-request", user_id: user.id });
    log.info({ request_id: request.id }, "createTransferRequest completed");
  });

  return ok({ requestId: request.id });
}
