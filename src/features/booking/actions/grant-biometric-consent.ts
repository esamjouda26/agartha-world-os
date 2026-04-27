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
import { guestSpan } from "@/lib/telemetry-guest";

import { BIOMETRIC_POLICY_VERSION, BIOMETRIC_RETENTION_POLICY } from "@/features/booking/constants";
import { BOOKING_ROUTER_PATHS } from "@/features/booking/cache-tags";

/**
 * Grant biometric-enrolment consent for one attendee.
 *
 * Spec: frontend_spec.md:3660 + WF-7B "Consent Gate".
 *   INSERT INTO consent_records (subject_id = attendee_id,
 *     subject_type = 'booking_attendee',
 *     consent_type = 'biometric_enrollment',
 *     legal_basis = 'explicit_consent',
 *     purpose = 'face_pay_and_autocapture',
 *     retention_policy = 'visit_end_plus_24h',
 *     policy_version = current,
 *     granted_at = NOW(), ip_address, user_agent);
 *
 * Idempotency: SELECT-then-INSERT against the active partial index
 * (idx_consent_records_active). If an active row exists for
 * (attendee_id, consent_type), we return success without inserting a
 * duplicate — keeps the consent ledger clean across double-submits.
 *
 * Service-role required because consent_records is Tier 6 default-deny.
 * Cookie-bound: the action verifies the attendee belongs to the
 * session-bound booking before touching the row.
 */

const inputSchema = z.object({
  attendee_id: z.guid("Invalid attendee"),
});
type GrantConsentInput = z.infer<typeof inputSchema>;

const limiter = createRateLimiter({
  // One grant per attendee is the norm; tight limit prevents an attacker
  // who got the session cookie from spamming the consent ledger.
  tokens: 12,
  window: "10 m",
  prefix: "guest-grant-consent",
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

type GrantConsentSuccess = Readonly<{
  consent_id: string;
  attendee_id: string;
  granted_at: string;
  policy_version: string;
  /** True when we returned an existing active row instead of inserting. */
  reused_existing: boolean;
}>;

export async function grantBiometricConsentAction(
  input: GrantConsentInput,
): Promise<ServerActionResult<GrantConsentSuccess>> {
  return guestSpan({ name: "guest.biometric.granted" }, () =>
    grantBiometricConsentActionImpl(input),
  );
}

async function grantBiometricConsentActionImpl(
  input: GrantConsentInput,
): Promise<ServerActionResult<GrantConsentSuccess>> {
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

  // Auth — guest session cookie.
  const sessionRef = await readGuestSession();
  if (!sessionRef) return fail("UNAUTHENTICATED");

  const { ip, userAgent } = await clientContext();
  const lim = await limiter.limit(ip);
  if (!lim.success) return fail("RATE_LIMITED");

  const supabase = createSupabaseServiceClient();

  // Verify attendee belongs to cookie-bound booking.
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

  // Idempotency: return existing active row if any.
  const { data: existing } = await supabase
    .from("consent_records")
    .select("id, granted_at, policy_version")
    .eq("subject_type", "booking_attendee")
    .eq("subject_id", parsed.data.attendee_id)
    .eq("consent_type", "biometric_enrollment")
    .is("withdrawn_at", null)
    .maybeSingle();

  if (existing) {
    return ok({
      consent_id: existing.id,
      attendee_id: parsed.data.attendee_id,
      granted_at: existing.granted_at,
      policy_version: existing.policy_version,
      reused_existing: true,
    });
  }

  // Insert fresh consent row.
  const { data: inserted, error: insertError } = await supabase
    .from("consent_records")
    .insert({
      subject_id: parsed.data.attendee_id,
      subject_type: "booking_attendee",
      consent_type: "biometric_enrollment",
      legal_basis: "explicit_consent",
      purpose: "face_pay_and_autocapture",
      retention_policy: BIOMETRIC_RETENTION_POLICY,
      policy_version: BIOMETRIC_POLICY_VERSION,
      ip_address: ip,
      user_agent: userAgent,
    })
    .select("id, granted_at, policy_version")
    .single();

  if (insertError || !inserted) {
    after(async () => {
      loggerWith({ feature: "booking", event: "consent.grant_error" }).error(
        { msg: insertError?.message, attendee_id: parsed.data.attendee_id },
        "grantBiometricConsentAction failed",
      );
    });
    return fail("INTERNAL");
  }

  for (const path of BOOKING_ROUTER_PATHS) {
    revalidatePath(path, "page");
  }

  after(async () => {
    loggerWith({ feature: "booking", event: "consent.granted" }).info(
      {
        attendee_id: parsed.data.attendee_id,
        policy_version: BIOMETRIC_POLICY_VERSION,
      },
      "grantBiometricConsentAction",
    );
  });

  return ok({
    consent_id: inserted.id,
    attendee_id: parsed.data.attendee_id,
    granted_at: inserted.granted_at,
    policy_version: inserted.policy_version,
    reused_existing: false,
  });
}
