import "server-only";

import { cache } from "react";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { readGuestSession } from "@/lib/auth/guest-session";
import type { Database } from "@/types/database";

/**
 * RSC fetcher for /my-booking/manage/biometrics.
 *
 * Pulls the per-attendee privacy state in one shot:
 *   - attendee identity (nickname, type, index)
 *   - active consent row (if any)
 *   - biometric vector existence (enrolment status)
 *   - last 5 biometric_access_log events
 *
 * All access goes via service-role because:
 *   - consent_records is Tier 6 default-deny (no anon/authenticated SELECT policy)
 *   - biometric_access_log is append-only (no SELECT policy for non-service)
 *   - the guest's identity is established by the cookie session, NOT auth.uid()
 *
 * Wrapped in `cache()` so a single render tree (page + each attendee
 * card) hits the DB once.
 */

export type BiometricAccessLogEntry = Readonly<{
  id: string;
  event:
    | "enroll"
    | "match_attempt"
    | "withdraw_and_delete"
    | "auto_delete_retention"
    | "dsr_erasure";
  actor_type: "guest_self" | "staff" | "system";
  match_result: boolean | null;
  confidence_score: number | null;
  created_at: string;
}>;

export type BiometricAttendeeContext = Readonly<{
  attendee_id: string;
  attendee_type: "adult" | "child";
  attendee_index: number;
  nickname: string | null;
  face_pay_enabled: boolean;
  auto_capture_enabled: boolean;
  has_biometric: boolean;
  /** Active (not-withdrawn) consent_records row for biometric_enrollment. */
  active_consent: Readonly<{
    id: string;
    granted_at: string;
    policy_version: string;
  }> | null;
  /** Most-recent withdrawn consent (if active is null) — informational only. */
  last_withdrawn: Readonly<{ withdrawn_at: string; withdrawal_method: string }> | null;
  recent_access_log: readonly BiometricAccessLogEntry[];
}>;

export type BiometricsContext = Readonly<{
  booking: Readonly<{
    id: string;
    booking_ref: string;
    status: Database["public"]["Enums"]["booking_status"];
    booker_email: string;
  }>;
  attendees: readonly BiometricAttendeeContext[];
}>;

export const getBiometricsContext = cache(async (): Promise<BiometricsContext | null> => {
  const sessionRef = await readGuestSession();
  if (!sessionRef) return null;

  const supabase = createSupabaseServiceClient();

  // 1. Resolve booking by ref (cookie-bound).
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, booking_ref, status, booker_email")
    .eq("booking_ref", sessionRef)
    .maybeSingle();
  if (bookingError || !booking) return null;

  // 2. Attendees for this booking.
  const { data: attendeesRaw, error: attendeesError } = await supabase
    .from("booking_attendees")
    .select("id, attendee_type, attendee_index, nickname, face_pay_enabled, auto_capture_enabled")
    .eq("booking_id", booking.id)
    .order("attendee_type", { ascending: true })
    .order("attendee_index", { ascending: true });
  if (attendeesError || !attendeesRaw) return null;
  if (attendeesRaw.length === 0) {
    return {
      booking: {
        id: booking.id,
        booking_ref: booking.booking_ref,
        status: (booking.status ??
          "pending_payment") as Database["public"]["Enums"]["booking_status"],
        booker_email: booking.booker_email,
      },
      attendees: [],
    };
  }

  const attendeeIds = attendeesRaw.map((a) => a.id);

  // 3. Parallel: vectors (existence), consent rows, access log.
  const [vectorsRes, consentsRes, logRes] = await Promise.all([
    supabase.from("biometric_vectors").select("attendee_id").in("attendee_id", attendeeIds),
    supabase
      .from("consent_records")
      .select(
        "id, subject_id, granted_at, withdrawn_at, withdrawal_method, policy_version, consent_type",
      )
      .eq("subject_type", "booking_attendee")
      .eq("consent_type", "biometric_enrollment")
      .in("subject_id", attendeeIds)
      .order("granted_at", { ascending: false }),
    supabase
      .from("biometric_access_log")
      .select("id, attendee_id, event, actor_type, match_result, confidence_score, created_at")
      .in("attendee_id", attendeeIds)
      .order("created_at", { ascending: false })
      .limit(5 * attendeeIds.length),
  ]);

  const enrolledIds = new Set((vectorsRes.data ?? []).map((v) => v.attendee_id));

  type ConsentRow = NonNullable<typeof consentsRes.data>[number];
  const activeByAttendee = new Map<string, ConsentRow>();
  const lastWithdrawnByAttendee = new Map<string, ConsentRow>();
  for (const row of consentsRes.data ?? []) {
    if (!row.withdrawn_at) {
      // First active wins (rows are ordered by granted_at desc).
      if (!activeByAttendee.has(row.subject_id)) activeByAttendee.set(row.subject_id, row);
    } else {
      if (!lastWithdrawnByAttendee.has(row.subject_id))
        lastWithdrawnByAttendee.set(row.subject_id, row);
    }
  }

  type LogRow = NonNullable<typeof logRes.data>[number];
  const logByAttendee = new Map<string, LogRow[]>();
  for (const row of logRes.data ?? []) {
    const list = logByAttendee.get(row.attendee_id) ?? [];
    if (list.length < 5) list.push(row);
    logByAttendee.set(row.attendee_id, list);
  }

  const attendees: readonly BiometricAttendeeContext[] = attendeesRaw.map((a) => {
    const active = activeByAttendee.get(a.id);
    const withdrawn = lastWithdrawnByAttendee.get(a.id);
    return {
      attendee_id: a.id,
      attendee_type: a.attendee_type as "adult" | "child",
      attendee_index: a.attendee_index,
      nickname: a.nickname,
      face_pay_enabled: a.face_pay_enabled ?? false,
      auto_capture_enabled: a.auto_capture_enabled ?? false,
      has_biometric: enrolledIds.has(a.id),
      active_consent: active
        ? { id: active.id, granted_at: active.granted_at, policy_version: active.policy_version }
        : null,
      last_withdrawn:
        !active && withdrawn?.withdrawn_at
          ? {
              withdrawn_at: withdrawn.withdrawn_at,
              withdrawal_method: withdrawn.withdrawal_method ?? "guest_self_service",
            }
          : null,
      recent_access_log: (logByAttendee.get(a.id) ?? []).map((row) => ({
        id: row.id,
        event: row.event as BiometricAccessLogEntry["event"],
        actor_type: row.actor_type as BiometricAccessLogEntry["actor_type"],
        match_result: row.match_result,
        confidence_score: row.confidence_score === null ? null : Number(row.confidence_score),
        created_at: row.created_at,
      })),
    };
  });

  return {
    booking: {
      id: booking.id,
      booking_ref: booking.booking_ref,
      status: (booking.status ??
        "pending_payment") as Database["public"]["Enums"]["booking_status"],
      booker_email: booking.booker_email,
    },
    attendees,
  };
});
