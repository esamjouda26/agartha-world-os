"use server";

import "server-only";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { z } from "zod";

import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { HR_ROUTER_PATHS } from "@/features/hr/cache-tags";

const schema = z
  .object({
    leaveTypeId: z.string().min(1),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    requestedDays: z.number().positive(),
    reason: z.string().optional(),
  })
  .refine((d) => new Date(d.endDate) >= new Date(d.startDate), {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

const limiter = createRateLimiter({ tokens: 10, window: "60 s", prefix: "leave-create" });

/**
 * Create a new leave request (status = 'pending').
 * init_schema.sql:1560 — leave_requests table.
 */
export async function createLeaveRequestAction(
  input: unknown,
): Promise<ServerActionResult<{ leaveRequestId: string }>> {
  const parsed = schema.safeParse(input);
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
  if (!appMeta.domains?.hr?.includes("c")) return fail("FORBIDDEN");

  const lim = await limiter.limit(user.id);
  if (!lim.success) return fail("RATE_LIMITED");

  // Atomic insert via rpc_create_leave_request — resolves staff_record_id
  // from the actor inside the same transaction (CLAUDE.md §4 transactional
  // boundary). The exclusion constraint on overlapping date ranges raises
  // 'overlap_with_existing'.
  const { data: leaveRequestId, error } = await supabase.rpc("rpc_create_leave_request", {
    p_leave_type_id: parsed.data.leaveTypeId,
    p_start_date: parsed.data.startDate,
    p_end_date: parsed.data.endDate,
    p_requested_days: parsed.data.requestedDays,
    p_reason: (parsed.data.reason ?? null) as string,
    p_actor_id: user.id,
  });

  if (error) {
    if (error.message.includes("staff_record_not_linked")) return fail("FORBIDDEN");
    if (error.message.includes("overlap_with_existing")) return fail("CONFLICT");
    return fail("INTERNAL");
  }

  for (const path of HR_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    loggerWith({ feature: "hr", event: "create_leave_request", user_id: user.id }).info(
      { leaveRequestId },
      "createLeaveRequestAction completed",
    );
  });

  return ok({ leaveRequestId: leaveRequestId as string });
}
