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

  const { data: profile } = await supabase
    .from("profiles")
    .select("staff_record_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.staff_record_id) return fail("FORBIDDEN");

  const { data, error } = await supabase
    .from("leave_requests")
    .insert({
      staff_record_id: profile.staff_record_id,
      leave_type_id: parsed.data.leaveTypeId,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
      requested_days: parsed.data.requestedDays,
      reason: parsed.data.reason ?? null,
      status: "pending",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23P01") return fail("CONFLICT"); // exclusion constraint (overlapping dates)
    return fail("INTERNAL");
  }

  for (const path of HR_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    loggerWith({ feature: "hr", event: "create_leave_request", user_id: user.id }).info(
      { leaveRequestId: data.id },
      "createLeaveRequestAction completed",
    );
  });

  return ok({ leaveRequestId: data.id });
}
