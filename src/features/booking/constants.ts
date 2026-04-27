import type { BookingStatus } from "@/features/booking/types";

/**
 * Display labels and badge variants for each booking status.
 * Mirrors booking_status enum: init_schema.sql:5632.
 */
export const BOOKING_STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending_payment: { label: "Pending Payment", variant: "outline" },
  confirmed: { label: "Confirmed", variant: "default" },
  checked_in: { label: "Checked In", variant: "secondary" },
  completed: { label: "Completed", variant: "secondary" },
  no_show: { label: "No Show", variant: "destructive" },
} as const;

/** Rate limits for entry-validation actions. */
export const BOOKING_LOOKUP_RATE_LIMIT_TOKENS = 60;
export const BOOKING_LOOKUP_RATE_LIMIT_WINDOW = "60 s" as const;

export const BOOKING_CHECKIN_RATE_LIMIT_TOKENS = 30;
export const BOOKING_CHECKIN_RATE_LIMIT_WINDOW = "60 s" as const;

/**
 * Cookie that bridges /my-booking → /my-booking/verify. Set by the OTP
 * lookup action after a successful rpc_get_booking_identity call; the
 * verify page reads it to display the masked-email reminder. httpOnly,
 * 5-minute TTL (matches otp_challenges.expires_at).
 */
export const GUEST_OTP_PENDING_COOKIE = "guest_otp_pending";

/**
 * Cookie that holds the post-payment booking_ref so /book/payment can
 * resume the flow without leaking the ref through the URL. Set by
 * createBookingAction; cleared once /my-booking/manage takes over.
 */
export const GUEST_BOOKING_REF_COOKIE = "guest_booking_ref";

/**
 * Cookie that authenticates the guest against /my-booking/manage routes
 * after OTP verification. Signed payload contains booking_ref + expiry.
 * httpOnly, sameSite=strict, path-scoped, 4-hour TTL per spec line 3575.
 */
export const GUEST_SESSION_COOKIE = "guest_session";

/**
 * Privacy policy version stamped on each consent_records row. Must be
 * bumped whenever the disclosure text materially changes; existing
 * grants then auto-expire (their `policy_version` mismatches the live
 * version) and the guest re-consents per WF-7B "Consent re-solicitation".
 *
 * Format: ISO date of the policy revision (`YYYY-MM-DD`). Stored in DB
 * as plain text per `consent_records.policy_version`.
 */
export const BIOMETRIC_POLICY_VERSION = "2026-04-27";

/**
 * `consent_records.retention_policy` value for biometric enrolment.
 * Mirrors the spec literal — `cron-biometric-retention` reads this
 * marker indirectly via slot end + 24h (init_schema.sql:6970+).
 */
export const BIOMETRIC_RETENTION_POLICY = "visit_end_plus_24h";

/** Privacy contact surfaced on the consent disclosure + page footer. */
export const PRIVACY_CONTACT_EMAIL = "privacy@agartha.example";
