-- =============================================================================
-- Migration: email_dispatch_log idempotency ledger for transactional email
-- =============================================================================
-- The `send-email` Edge Function (supabase/functions/send-email/index.ts) is
-- the single transactional-email entry point: booking OTPs, confirmations,
-- reschedules, cascaded reschedules, staff invites, scheduled-report
-- deliveries, and (post-PR-1) payment-failure notices. Today every invocation
-- ships an email — replays from a webhook retry, double-clicked CTA, or
-- pg_cron job that fires twice all produce duplicate inbox copies. This is
-- spammy at best and a deliverability/reputation hazard at worst (Resend
-- throttles senders whose recipients flag duplicates).
--
-- This migration adds an append-only ledger keyed by
-- `(template_key, booking_id | recipient_email, parameters_hash)`. The
-- function INSERTs a row before sending; on unique-violation it short-
-- circuits and returns `{ idempotent: true }` without invoking Resend. On
-- send completion the row is updated with `resend_message_id` (success) or
-- `error` (failure) for ops debugging.
--
-- Two separate partial unique indexes:
--   * `idx_email_dispatch_log_dedup_booking` — booking-scoped flows
--     (booking_otp, booking_confirmation, booking_modified, booking_cascaded,
--     payment_failed). booking_id is the natural per-booking dedup key.
--   * `idx_email_dispatch_log_dedup_recipient` — non-booking flows
--     (staff_invite, report_ready). recipient_email is the dedup key when
--     no booking is in scope.
--
-- A single composite UNIQUE constraint over both keys would force every row
-- to NULL one or the other and the constraint would still be enforceable,
-- BUT NULLs aren't deduplicated by default in PostgreSQL — so the
-- enforcement would silently allow duplicates. Two partial indexes side-
-- step that.
--
-- Why TEXT for parameters_hash, not BYTEA: the function is Deno-based and
-- emits SHA-256 hex strings. TEXT keeps the comparison trivially indexable
-- without `encode/decode` overhead on every read.
--
-- RLS: service-role-only. No policies = default-deny under
-- `ENABLE ROW LEVEL SECURITY`. The Edge Function uses the service-role key
-- (which bypasses RLS by design); no app-level reader needs this table —
-- it's an ops/audit surface only.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.email_dispatch_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_key TEXT NOT NULL,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    -- recipient_email is `restricted` per CLAUDE.md §2 (PII). Retained for
    -- support diagnostics — searchable by recipient when a guest asks
    -- "did you send me an email?". Logs MUST NOT include this column.
    recipient_email TEXT,
    parameters_hash TEXT NOT NULL,
    sent_at TIMESTAMPTZ,
    resend_message_id TEXT,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.email_dispatch_log
    IS 'Append-only idempotency ledger for transactional email. INSERT-before-send pattern; unique partial indexes prevent duplicate sends. Service-role only.';
COMMENT ON COLUMN public.email_dispatch_log.template_key
    IS 'Flow discriminator: booking_otp | booking_confirmation | booking_modified | booking_cascaded | payment_failed | staff_invite | report_ready. (public)';
COMMENT ON COLUMN public.email_dispatch_log.booking_id
    IS 'Booking the email pertains to, when applicable. NULL for staff_invite + report_ready. (internal)';
COMMENT ON COLUMN public.email_dispatch_log.recipient_email
    IS 'Resend `to` address. Required-for-debug only; classified restricted. (restricted)';
COMMENT ON COLUMN public.email_dispatch_log.parameters_hash
    IS 'SHA-256 hex of the flow-specific dedup tuple (e.g. otp_code+expires_at for booking_otp). Same input twice → same hash → unique-violation → idempotent short-circuit. (public)';
COMMENT ON COLUMN public.email_dispatch_log.sent_at
    IS 'Set by the Edge Function on Resend success. NULL when the row was inserted but Resend failed; pair with `error`. (public)';
COMMENT ON COLUMN public.email_dispatch_log.resend_message_id
    IS 'Resend `id` from the send response. Used for delivery-status correlation in support tickets. (internal)';
COMMENT ON COLUMN public.email_dispatch_log.error
    IS 'Resend error body when the send failed. NULL on success. (internal)';

-- Booking-scoped dedup. Same booking + same template + same parameters
-- hash → second INSERT raises unique_violation → function short-circuits.
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_dispatch_log_dedup_booking
    ON public.email_dispatch_log (template_key, booking_id, parameters_hash)
    WHERE booking_id IS NOT NULL;

-- Recipient-scoped dedup for non-booking flows.
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_dispatch_log_dedup_recipient
    ON public.email_dispatch_log (template_key, recipient_email, parameters_hash)
    WHERE booking_id IS NULL AND recipient_email IS NOT NULL;

-- Per CLAUDE.md §2: B-tree on every FK column. The partial unique above
-- only covers WHERE booking_id IS NOT NULL; an unconditional index on
-- booking_id alone keeps `... WHERE booking_id = ?` lookups (e.g. ops
-- ticket: "show me every email we sent for booking X") fast.
CREATE INDEX IF NOT EXISTS idx_email_dispatch_log_booking_id
    ON public.email_dispatch_log (booking_id)
    WHERE booking_id IS NOT NULL;

-- Default-deny: no policies. Service-role bypasses RLS, anon/authenticated
-- get nothing.
ALTER TABLE public.email_dispatch_log ENABLE ROW LEVEL SECURITY;
