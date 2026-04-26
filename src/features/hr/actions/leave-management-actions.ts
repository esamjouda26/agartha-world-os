"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { HR_ROUTER_PATHS } from "@/features/hr/cache-tags";
import {
  approveLeaveSchema,
  rejectLeaveSchema,
  cancelLeaveSchema,
  createLedgerEntrySchema,
  leaveTypeSchema,
  leavePolicySchema,
  deleteLeaveTypeSchema,
} from "@/features/hr/schemas/leave-management";

const limiter = createRateLimiter({ tokens: 30, window: "1 m", prefix: "hr-leave-mgmt" });

// ── Helpers ────────────────────────────────────────────────────────────

async function authGuard(requiredAccess: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "UNAUTHENTICATED" as const, supabase, user: null };
  const appMeta = (user.app_metadata ?? {}) as { domains?: Record<string, string[]> };
  const hrAccess = appMeta.domains?.hr ?? [];
  if (!hrAccess.includes(requiredAccess))
    return { error: "FORBIDDEN" as const, supabase, user: null };
  const lim = await limiter.limit(user.id);
  if (!lim.success) return { error: "RATE_LIMITED" as const, supabase, user: null };
  return { error: null, supabase, user };
}

function revalidateLeave() {
  for (const path of HR_ROUTER_PATHS) revalidatePath(path, "page");
}

// ── Leave Request Actions ──────────────────────────────────────────────

/** Approve a pending leave request. Trigger fires to insert leave_ledger usage entry. */
export async function approveLeaveAction(
  input: unknown,
): Promise<ServerActionResult<{ requestId: string }>> {
  const parsed = approveLeaveSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_FAILED");
  const { error: authErr, supabase, user } = await authGuard("u");
  if (authErr) return fail(authErr);

  const { error } = await supabase
    .from("leave_requests")
    .update({
      status: "approved",
      reviewed_by: user!.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.requestId)
    .eq("status", "pending");

  if (error) return fail("INTERNAL");

  revalidateLeave();

  after(async () => {
    loggerWith({ feature: "hr", event: "approve_leave", user_id: user!.id }).info(
      { request_id: parsed.data.requestId },
      "approveLeaveAction completed",
    );
  });

  return ok({ requestId: parsed.data.requestId });
}

/** Reject a pending leave request with required rejection_reason. */
export async function rejectLeaveAction(
  input: unknown,
): Promise<ServerActionResult<{ requestId: string }>> {
  const parsed = rejectLeaveSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[issue.path.join(".") || "form"] = issue.message;
    return fail("VALIDATION_FAILED", fields);
  }
  const { error: authErr, supabase, user } = await authGuard("u");
  if (authErr) return fail(authErr);

  const { error } = await supabase
    .from("leave_requests")
    .update({
      status: "rejected",
      rejection_reason: parsed.data.rejectionReason,
      reviewed_by: user!.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.requestId)
    .eq("status", "pending");

  if (error) return fail("INTERNAL");

  revalidateLeave();

  after(async () => {
    loggerWith({ feature: "hr", event: "reject_leave", user_id: user!.id }).info(
      { request_id: parsed.data.requestId },
      "rejectLeaveAction completed",
    );
  });

  return ok({ requestId: parsed.data.requestId });
}

/** Cancel a previously approved leave request. Trigger fires reversal ledger entry. */
export async function cancelApprovedLeaveAction(
  input: unknown,
): Promise<ServerActionResult<{ requestId: string }>> {
  const parsed = cancelLeaveSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_FAILED");
  const { error: authErr, supabase, user } = await authGuard("u");
  if (authErr) return fail(authErr);

  const { error } = await supabase
    .from("leave_requests")
    .update({
      status: "cancelled",
      reviewed_by: user!.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.requestId)
    .eq("status", "approved");

  if (error) return fail("INTERNAL");

  revalidateLeave();

  after(async () => {
    loggerWith({ feature: "hr", event: "cancel_leave", user_id: user!.id }).info(
      { request_id: parsed.data.requestId },
      "cancelApprovedLeaveAction completed",
    );
  });

  return ok({ requestId: parsed.data.requestId });
}

// ── Ledger Manual Entry ────────────────────────────────────────────────

/** Insert a manual leave_ledger entry (accrual, adjustment, etc.). */
export async function createLedgerEntryAction(
  input: unknown,
): Promise<ServerActionResult<{ id: string }>> {
  const parsed = createLedgerEntrySchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[issue.path.join(".") || "form"] = issue.message;
    return fail("VALIDATION_FAILED", fields);
  }
  const { error: authErr, supabase, user } = await authGuard("c");
  if (authErr) return fail(authErr);

  const { data, error } = await supabase
    .from("leave_ledger")
    .insert({
      staff_record_id: parsed.data.staffRecordId,
      leave_type_id: parsed.data.leaveTypeId,
      transaction_type: parsed.data.transactionType,
      days: parsed.data.days,
      fiscal_year: parsed.data.fiscalYear,
      transaction_date: new Date().toISOString().slice(0, 10),
      notes: parsed.data.notes || null,
      created_by: user!.id,
    })
    .select("id")
    .single();

  if (error) return fail("INTERNAL");

  revalidateLeave();

  after(async () => {
    loggerWith({ feature: "hr", event: "create_ledger_entry", user_id: user!.id }).info(
      { ledger_id: data.id },
      "createLedgerEntryAction completed",
    );
  });

  return ok({ id: data.id });
}

// ── Leave Type CRUD ────────────────────────────────────────────────────

export async function createLeaveTypeAction(
  input: unknown,
): Promise<ServerActionResult<{ id: string }>> {
  const parsed = leaveTypeSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_FAILED");
  const { error: authErr, supabase, user } = await authGuard("c");
  if (authErr) return fail(authErr);

  const d = parsed.data;
  const { data, error } = await supabase
    .from("leave_types")
    .insert({
      code: d.code,
      name: d.name,
      is_paid: d.isPaid,
      is_active: d.isActive,
      created_by: user!.id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.message.includes("unique")) return fail("CONFLICT");
    return fail("INTERNAL");
  }

  revalidateLeave();
  return ok({ id: data.id });
}

export async function updateLeaveTypeAction(
  input: unknown,
): Promise<ServerActionResult<{ id: string }>> {
  const parsed = leaveTypeSchema.safeParse(input);
  if (!parsed.success || !parsed.data.id) return fail("VALIDATION_FAILED");
  const { error: authErr, supabase, user } = await authGuard("u");
  if (authErr) return fail(authErr);

  const d = parsed.data;
  const { error } = await supabase
    .from("leave_types")
    .update({
      code: d.code,
      name: d.name,
      is_paid: d.isPaid,
      is_active: d.isActive,
      updated_by: user!.id,
    })
    .eq("id", d.id!);

  if (error) {
    if (error.message.includes("unique")) return fail("CONFLICT");
    return fail("INTERNAL");
  }

  revalidateLeave();
  return ok({ id: d.id! });
}

export async function deleteLeaveTypeAction(
  input: unknown,
): Promise<ServerActionResult<{ id: string }>> {
  const parsed = deleteLeaveTypeSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_FAILED");
  const { error: authErr, supabase } = await authGuard("d");
  if (authErr) return fail(authErr);

  const { error } = await supabase.from("leave_types").delete().eq("id", parsed.data.id);

  if (error) return fail("INTERNAL");

  revalidateLeave();
  return ok({ id: parsed.data.id });
}

// ── Leave Policy CRUD ──────────────────────────────────────────────────

export async function createPolicyAction(
  input: unknown,
): Promise<ServerActionResult<{ id: string }>> {
  const parsed = leavePolicySchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_FAILED");
  const { error: authErr, supabase, user } = await authGuard("c");
  if (authErr) return fail(authErr);

  const d = parsed.data;

  // Insert policy
  const { data: policy, error: policyError } = await supabase
    .from("leave_policies")
    .insert({
      name: d.name,
      description: d.description || null,
      is_active: d.isActive,
      created_by: user!.id,
    })
    .select("id")
    .single();

  if (policyError) {
    if (policyError.message.includes("unique")) return fail("CONFLICT");
    return fail("INTERNAL");
  }

  // Insert entitlements
  if (d.entitlements.length > 0) {
    const { error: entError } = await supabase.from("leave_policy_entitlements").insert(
      d.entitlements.map((e) => ({
        policy_id: policy.id,
        leave_type_id: e.leaveTypeId,
        days_per_year: e.daysPerYear,
        frequency: e.frequency,
      })),
    );
    if (entError) return fail("INTERNAL");
  }

  revalidateLeave();
  return ok({ id: policy.id });
}

export async function updatePolicyAction(
  input: unknown,
): Promise<ServerActionResult<{ id: string }>> {
  const parsed = leavePolicySchema.safeParse(input);
  if (!parsed.success || !parsed.data.id) return fail("VALIDATION_FAILED");
  const { error: authErr, supabase, user } = await authGuard("u");
  if (authErr) return fail(authErr);

  const d = parsed.data;

  // Update policy
  const { error: policyError } = await supabase
    .from("leave_policies")
    .update({
      name: d.name,
      description: d.description || null,
      is_active: d.isActive,
      updated_by: user!.id,
    })
    .eq("id", d.id!);

  if (policyError) return fail("INTERNAL");

  // Replace entitlements: delete old, insert new
  await supabase.from("leave_policy_entitlements").delete().eq("policy_id", d.id!);

  if (d.entitlements.length > 0) {
    const { error: entError } = await supabase.from("leave_policy_entitlements").insert(
      d.entitlements.map((e) => ({
        policy_id: d.id!,
        leave_type_id: e.leaveTypeId,
        days_per_year: e.daysPerYear,
        frequency: e.frequency,
      })),
    );
    if (entError) return fail("INTERNAL");
  }

  revalidateLeave();
  return ok({ id: d.id! });
}
