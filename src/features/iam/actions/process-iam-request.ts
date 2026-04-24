"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { IAM_ROUTER_PATHS } from "@/features/iam/cache-tags";

// ── Schemas ─────────────────────────────────────────────────────────────

const approveSchema = z.object({
  requestId: z.string().uuid(),
  /** Optional business email override — only used for provisioning requests. */
  businessEmailOverride: z.string().email().optional(),
  /** Optional display name override (default: first + last from legal_name). */
  displayNameOverride: z.string().min(1).max(100).optional(),
  /** Optional employee ID override (default: next EMP#### sequence). */
  employeeIdOverride: z.string().min(1).max(20).optional(),
  /** Optional IT note recorded with the approval. */
  itRemark: z.string().max(1000).optional(),
});

const rejectSchema = z.object({
  requestId: z.string().uuid(),
  itRemark: z.string().min(1, "A reason is required").max(1000),
});

// ── Rate limiter ────────────────────────────────────────────────────────

const limiter = createRateLimiter({
  tokens: 10,
  window: "60 s",
  prefix: "iam-action",
});

// ── Approve ─────────────────────────────────────────────────────────────

/**
 * Approve an IAM request — 8-step pipeline per prompt.md.
 *
 * After setting status = 'approved', branches by request_type:
 *   - provisioning → invoke `send-email` Edge Function (staff_invite)
 *     which creates the auth user, links profile, and sends invite email.
 *   - transfer → UPDATE profiles.role_id → target_role_id.
 *   - termination/suspension → RPC admin_lock_account(lock: true).
 *   - reactivation → RPC admin_lock_account(lock: false).
 */
export async function approveIamRequest(
  input: unknown,
): Promise<ServerActionResult<{ requestId: string }>> {
  // 1. Zod parse
  const parsed = approveSchema.safeParse(input);
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

  // 4a. Fetch the request first to get type + related IDs
  const { data: request, error: fetchErr } = await supabase
    .from("iam_requests")
    .select("id, request_type, status, staff_record_id, target_role_id, current_role_id")
    .eq("id", parsed.data.requestId)
    .eq("status", "pending_it") // Idempotency guard: only approve pending
    .maybeSingle();

  if (fetchErr) return fail("INTERNAL");
  if (!request) return fail("CONFLICT"); // Already processed or not found

  // 4b. Update status → approved
  const { error: updateErr } = await supabase
    .from("iam_requests")
    .update({
      status: "approved",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      updated_by: user.id,
      ...(parsed.data.itRemark ? { it_remark: parsed.data.itRemark } : {}),
    })
    .eq("id", request.id)
    .eq("status", "pending_it"); // Double-check idempotency

  if (updateErr) return fail("INTERNAL");

  // 5. Post-approval side effects — branch by request_type
  const log = loggerWith({
    feature: "iam",
    event: "approve",
    user_id: user.id,
  });

  try {
    switch (request.request_type) {
      case "provisioning": {
        // Resolve the target role and staff record
        const [staffRes, roleRes] = await Promise.all([
          supabase
            .from("staff_records")
            .select("legal_name")
            .eq("id", request.staff_record_id)
            .maybeSingle(),
          request.target_role_id
            ? supabase.from("roles").select("id").eq("id", request.target_role_id).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ]);

        const staffName = staffRes.data?.legal_name ?? "unknown";
        const roleId = roleRes.data?.id ?? request.target_role_id;

        // Work email: override or auto-generate from legal_name
        const workEmail = parsed.data.businessEmailOverride ?? generateBusinessEmail(staffName);

        // Display name: override or derive first + last from legal_name
        const nameParts = staffName.trim().split(/\s+/);
        const defaultDisplayName =
          nameParts.length > 1
            ? `${nameParts[0]} ${nameParts[nameParts.length - 1]}`
            : nameParts[0];
        const displayName = parsed.data.displayNameOverride ?? defaultDisplayName;

        // Employee ID: override or auto-increment from max
        const { data: maxRow } = await supabase
          .from("profiles")
          .select("employee_id")
          .not("employee_id", "is", null)
          .order("employee_id", { ascending: false })
          .limit(1)
          .maybeSingle();
        const maxNum = maxRow?.employee_id
          ? parseInt(maxRow.employee_id.replace("EMP", ""), 10)
          : 0;
        const defaultEmployeeId = `EMP${String(maxNum + 1).padStart(4, "0")}`;
        const employeeId = parsed.data.employeeIdOverride ?? defaultEmployeeId;

        // Invoke send-email Edge Function (verify_jwt: false)
        const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`;
        const fnRes = await fetch(fnUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({
            type: "staff_invite",
            staff_record_id: request.staff_record_id,
            work_email: workEmail,
            role_id: roleId,
            display_name: displayName,
            employee_id: employeeId,
            iam_request_id: request.id,
          }),
        });

        if (!fnRes.ok) {
          const fnBody = await fnRes.text();
          log.error(
            { error: fnBody, status: fnRes.status },
            "send-email Edge Function failed for provisioning",
          );
        } else {
          log.info({ work_email: workEmail, employee_id: employeeId }, "provisioning invite sent");
        }
        break;
      }

      case "transfer": {
        if (!request.target_role_id) {
          log.warn("transfer approved but target_role_id is null — skipping role update");
          break;
        }

        // Find the profile linked to this staff_record_id
        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("id")
          .eq("staff_record_id", request.staff_record_id)
          .maybeSingle();

        if (profileErr || !profile) {
          log.error(
            { error: profileErr?.message ?? "profile not found" },
            "transfer: failed to find profile for staff_record_id",
          );
          break;
        }

        // Update profiles.role_id → target_role_id
        // The DB trigger handle_profile_role_change will:
        //   - Sync JWT metadata (staff_role, access_level, domains)
        //   - Stamp last_permission_update → invalidates active sessions
        const { error: roleErr } = await supabase
          .from("profiles")
          .update({
            role_id: request.target_role_id,
            updated_by: user.id,
          })
          .eq("id", profile.id);

        if (roleErr) {
          log.error({ error: roleErr.message }, "transfer: failed to update profiles.role_id");
        } else {
          log.info(
            { profile_id: profile.id, new_role_id: request.target_role_id },
            "transfer: profiles.role_id updated, trigger will sync JWT",
          );
        }
        break;
      }

      case "termination":
      case "suspension": {
        // Find the auth user linked to this staff_record_id
        const { data: targetProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("staff_record_id", request.staff_record_id)
          .maybeSingle();

        if (!targetProfile) {
          log.warn("termination/suspension: no profile found for staff_record_id — skipping lock");
          break;
        }

        // Call admin_lock_account RPC
        // Authorization: requires system:d in the caller's JWT
        const { error: lockErr } = await supabase.rpc("admin_lock_account", {
          p_target_user_id: targetProfile.id,
          p_lock: true,
          p_reason:
            parsed.data.itRemark || `IAM ${request.request_type} approved (request ${request.id})`,
        });

        if (lockErr) {
          log.error(
            { error: lockErr.message },
            `${request.request_type}: admin_lock_account failed`,
          );
        } else {
          log.info(
            { target_user_id: targetProfile.id },
            `${request.request_type}: account locked, sessions invalidated`,
          );
        }

        // Update employment_status on profiles
        const newStatus = request.request_type === "termination" ? "terminated" : "suspended";
        await supabase
          .from("profiles")
          .update({
            employment_status: newStatus,
            updated_by: user.id,
          })
          .eq("id", targetProfile.id);
        break;
      }

      case "reactivation": {
        const { data: reactivateProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("staff_record_id", request.staff_record_id)
          .maybeSingle();

        if (!reactivateProfile) {
          log.warn("reactivation: no profile found for staff_record_id — skipping unlock");
          break;
        }

        // Call admin_lock_account RPC with p_lock = false
        const { error: unlockErr } = await supabase.rpc("admin_lock_account", {
          p_target_user_id: reactivateProfile.id,
          p_lock: false,
        });

        if (unlockErr) {
          log.error({ error: unlockErr.message }, "reactivation: admin_lock_account(false) failed");
        } else {
          log.info(
            { target_user_id: reactivateProfile.id },
            "reactivation: account unlocked, ban lifted",
          );
        }

        // Update employment_status back to active
        await supabase
          .from("profiles")
          .update({
            employment_status: "active",
            updated_by: user.id,
          })
          .eq("id", reactivateProfile.id);
        break;
      }

      default:
        log.warn({ request_type: request.request_type }, "unknown request_type — no side effects");
    }
  } catch (sideEffectErr) {
    // Side effects are best-effort — the approval itself succeeded.
    // Log for manual remediation but don't fail the action.
    log.error(
      { error: sideEffectErr instanceof Error ? sideEffectErr.message : String(sideEffectErr) },
      "post-approval side effect failed",
    );
  }

  // 7. Invalidate cache — surgical Router Cache bust per ADR-0006
  for (const path of IAM_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const afterLog = loggerWith({
      feature: "iam",
      event: "approve",
      user_id: user.id,
      request_id: parsed.data.requestId,
    });
    afterLog.info(
      { success: true, request_type: request.request_type },
      "approveIamRequest completed",
    );
  });

  return ok({ requestId: parsed.data.requestId });
}

// ── Reject ──────────────────────────────────────────────────────────────

/**
 * Reject an IAM request — 8-step pipeline per prompt.md.
 *
 * Sets status = 'rejected', it_remark, approved_by (for audit trail).
 */
export async function rejectIamRequest(
  input: unknown,
): Promise<ServerActionResult<{ requestId: string }>> {
  // 1. Zod parse
  const parsed = rejectSchema.safeParse(input);
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

  // 4. Execute
  const { error } = await supabase
    .from("iam_requests")
    .update({
      status: "rejected",
      it_remark: parsed.data.itRemark,
      approved_by: user.id,
      updated_by: user.id,
    })
    .eq("id", parsed.data.requestId)
    .eq("status", "pending_it"); // Idempotency guard

  if (error) return fail("INTERNAL");

  // 7. Invalidate cache
  for (const path of IAM_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const log = loggerWith({
      feature: "iam",
      event: "reject",
      user_id: user.id,
      request_id: parsed.data.requestId,
    });
    log.info({ success: true }, "rejectIamRequest completed");
  });

  return ok({ requestId: parsed.data.requestId });
}

// ── Helpers ─────────────────────────────────────────────────────────────

function generateBusinessEmail(legalName: string): string {
  const parts = legalName.toLowerCase().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "unknown@agartha.com";
  if (parts.length === 1) return `${parts[0]}@agartha.com`;
  return `${parts[0]}.${parts[parts.length - 1]}@agartha.com`;
}

// ── Direct Account Action (Suspend / Terminate / Reactivate) ────────────

const directAccountSchema = z.object({
  staffRecordId: z.string().uuid(),
  actionType: z.enum(["suspension", "termination", "reactivation"]),
  itRemark: z.string().max(1000).optional(),
});

/**
 * Direct account action — creates an iam_request of the given type,
 * immediately auto-approves it, and runs the side effects.
 *
 * This maintains the full audit trail while allowing the IT admin
 * to take immediate action from the detail view.
 */
export async function directAccountAction(
  input: unknown,
): Promise<ServerActionResult<{ requestId: string }>> {
  const log = loggerWith({ feature: "iam", event: "direct-account-action" });

  // 1. Validate
  const parsed = directAccountSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  const { staffRecordId, actionType, itRemark } = parsed.data;

  const supabase = await createSupabaseServerClient();

  // 2. Auth + RBAC — requires hr:u
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

  // 4. Create a new iam_request for audit trail
  const { data: newRequest, error: insertErr } = await supabase
    .from("iam_requests")
    .insert({
      request_type: actionType,
      staff_record_id: staffRecordId,
      status: "approved",
      it_remark: itRemark || null,
      created_by: user.id,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertErr || !newRequest) {
    log.error({ error: insertErr?.message }, "failed to create iam_request for direct action");
    return fail("INTERNAL");
  }

  // 5. Execute side effects
  try {
    // Find the profile linked to this staff_record
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("staff_record_id", staffRecordId)
      .maybeSingle();

    if (!targetProfile) {
      log.warn("direct action: no profile found for staff_record_id — skipping");
    } else if (actionType === "suspension" || actionType === "termination") {
      // Lock the account
      const { error: lockErr } = await supabase.rpc("admin_lock_account", {
        p_target_user_id: targetProfile.id,
        p_lock: true,
        p_reason: itRemark || `IAM ${actionType} (direct action, request ${newRequest.id})`,
      });
      if (lockErr) {
        log.error({ error: lockErr.message }, `${actionType}: admin_lock_account failed`);
      }

      // Update employment_status
      const newStatus = actionType === "termination" ? "terminated" : "suspended";
      await supabase
        .from("profiles")
        .update({
          employment_status: newStatus,
          updated_by: user.id,
        })
        .eq("id", targetProfile.id);

      log.info(
        { target_user_id: targetProfile.id, status: newStatus },
        `${actionType}: account locked, status updated`,
      );
    } else if (actionType === "reactivation") {
      // Unlock the account
      const { error: unlockErr } = await supabase.rpc("admin_lock_account", {
        p_target_user_id: targetProfile.id,
        p_lock: false,
      });
      if (unlockErr) {
        log.error({ error: unlockErr.message }, "reactivation: admin_lock_account(false) failed");
      }

      // Update employment_status back to active
      await supabase
        .from("profiles")
        .update({
          employment_status: "active",
          updated_by: user.id,
        })
        .eq("id", targetProfile.id);

      log.info(
        { target_user_id: targetProfile.id },
        "reactivation: account unlocked, status set to active",
      );
    }
  } catch (sideEffectErr) {
    log.error(
      { error: sideEffectErr instanceof Error ? sideEffectErr.message : String(sideEffectErr) },
      "direct action side effect failed",
    );
  }

  // 6. Invalidate cache
  for (const path of IAM_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    const afterLog = loggerWith({
      feature: "iam",
      event: "direct-account-action",
      user_id: user.id,
      request_id: newRequest.id,
    });
    afterLog.info({ success: true, action_type: actionType }, "directAccountAction completed");
  });

  return ok({ requestId: newRequest.id });
}
