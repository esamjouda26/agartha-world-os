"use server";

import "server-only";

import { after } from "next/server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { z } from "zod";

import { verifyGuestSameOrigin } from "@/lib/auth/guest-csrf";
import { fail, ok, type ServerActionResult } from "@/lib/errors";
import { loggerWith } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { readGuestSession } from "@/lib/auth/guest-session";

import { BOOKING_ROUTER_PATHS } from "@/features/booking/cache-tags";

/**
 * Withdraw biometric consent for one attendee.
 *
 * Spec: frontend_spec.md:3665-3670 — atomic consent withdraw + vector
 * delete + flag reset + audit log via `rpc_withdraw_biometric_consent`
 * (phase2_security_additions.sql:301-350). Service-role only.
 *
 * Cookie-bound: verify attendee belongs to the session-bound booking
 * BEFORE invoking the destructive RPC. Without this check a stolen
 * cookie could nuke any attendee's vector across the system.
 */

const inputSchema = z.object({
  attendee_id: z.guid("Invalid attendee"),
});
type WithdrawConsentInput = z.infer<typeof inputSchema>;

const limiter = createRateLimiter({
  tokens: 6,
  window: "10 m",
  prefix: "guest-withdraw-consent",
});

async function clientContext(): Promise<{ ip: string; userAgent: string }> {
  const h = await headers();
  return {
    ip:
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      h.get("cf-connecting-ip") ??
      "unknown",
    userAgent: h.get("user-agent") ?? "unknown",
  };
}

type WithdrawConsentSuccess = Readonly<{ attendee_id: string }>;

export async function withdrawBiometricConsentAction(
  input: WithdrawConsentInput,
): Promise<ServerActionResult<WithdrawConsentSuccess>> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] = issue.message;
    }
    return fail("VALIDATION_FAILED", fields);
  }

  // CSRF — same-origin check.
  if (!(await verifyGuestSameOrigin())) return fail("FORBIDDEN");

  const sessionRef = await readGuestSession();
  if (!sessionRef) return fail("UNAUTHENTICATED");

  const { ip, userAgent } = await clientContext();
  const lim = await limiter.limit(ip);
  if (!lim.success) return fail("RATE_LIMITED");

  const supabase = createSupabaseServiceClient();

  // Verify attendee belongs to cookie-bound booking before destructive call.
  const { data: attendee, error: lookupError } = await supabase
    .from("booking_attendees")
    .select("id, bookings!inner(booking_ref)")
    .eq("id", parsed.data.attendee_id)
    .maybeSingle();
  if (lookupError || !attendee) return fail("NOT_FOUND");
  const joinedRef = Array.isArray(attendee.bookings)
    ? attendee.bookings[0]?.booking_ref
    : attendee.bookings?.booking_ref;
  if (joinedRef?.toUpperCase() !== sessionRef) return fail("FORBIDDEN");

  // Atomic destructive call.
  const { error: rpcError } = await supabase.rpc("rpc_withdraw_biometric_consent", {
    p_attendee_id: parsed.data.attendee_id,
    p_actor_type: "guest_self",
    p_ip_address: ip as never,
    p_user_agent: userAgent,
  });

  if (rpcError) {
    after(async () => {
      loggerWith({ feature: "booking", event: "consent.withdraw_error" }).error(
        { msg: rpcError.message, attendee_id: parsed.data.attendee_id },
        "withdrawBiometricConsentAction failed",
      );
    });
    return fail("INTERNAL");
  }

  for (const path of BOOKING_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    loggerWith({ feature: "booking", event: "consent.withdrawn" }).info(
      { attendee_id: parsed.data.attendee_id },
      "withdrawBiometricConsentAction",
    );
  });

  return ok({ attendee_id: parsed.data.attendee_id });
}
