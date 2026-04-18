-- =============================================================================
-- Phase 2 Security & Compliance Additions
-- =============================================================================
-- Adds the DB objects prescribed by frontend_spec.md after the Phase 1 audit.
-- Must ship BEFORE the dependent routes are built — the builder will otherwise
-- fail at runtime on references to these tables / views / RPCs / cron jobs.
--
-- Dependencies on init_schema.sql: profiles, bookings, booking_attendees,
-- booking_payments, biometric_vectors, captured_photos, pos_points, orders,
-- order_items, suppliers, purchase_orders, attendance_exceptions, staff_records,
-- system_audit_log. Helpers: set_updated_at(), is_claims_fresh(),
-- get_app_config(), pg_cron extension.
--
-- OUT-OF-SCOPE (already shipped, do not duplicate):
--   cron-booking-abandon      -> init_schema uses 'cancel-expired-pending-payments'
--   cron-image-pipeline       -> event-driven Edge Function (Storage hook),
--                                not a pg_cron entry
-- =============================================================================

SET check_function_bodies = OFF;
SET client_min_messages = WARNING;
SET search_path = public, extensions;


-- =============================================================================
-- 1. idempotency_keys — universal replay guard
-- =============================================================================
-- Consumed by every mutation RPC that accepts a p_idempotency_key parameter and
-- by the offline queue replay pipeline on crew mobile routes.

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
    key             UUID         NOT NULL,
    scope           TEXT         NOT NULL,   -- e.g. 'rpc_clock_in', 'submit_pos_order', 'webhook_payment'
    actor_id        UUID,                     -- auth.uid() when known; NULL for anon/guest
    response_hash   TEXT         NOT NULL,    -- sha256(jsonb_response) so replays echo prior result
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ  NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    PRIMARY KEY (key, scope)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at ON public.idempotency_keys (expires_at);

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
-- No policies -> Tier 6 default deny. All access via SECURITY DEFINER RPCs.

COMMENT ON TABLE public.idempotency_keys IS 'Replay guard for idempotent RPCs + offline-queue retries. Service-role only.';


-- =============================================================================
-- 2. consent_records — GDPR Art. 9 / BIPA / PDPA consent ledger
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.consent_records (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id           UUID        NOT NULL,
    subject_type         TEXT        NOT NULL CHECK (subject_type IN ('booking_attendee', 'profile')),
    consent_type         TEXT        NOT NULL CHECK (consent_type IN (
                             'biometric_enrollment', 'auto_capture', 'marketing_email',
                             'minor_photo', 'analytics'
                         )),
    legal_basis          TEXT        NOT NULL CHECK (legal_basis IN (
                             'explicit_consent', 'contract', 'legitimate_interest', 'legal_obligation'
                         )),
    purpose              TEXT        NOT NULL,
    retention_policy     TEXT        NOT NULL,   -- e.g. 'visit_end_plus_24h', 'account_plus_7y'
    policy_version       TEXT        NOT NULL,   -- e.g. 'privacy-policy-2026-04'
    granted_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    withdrawn_at         TIMESTAMPTZ,
    withdrawal_method    TEXT        CHECK (withdrawal_method IS NULL OR withdrawal_method IN (
                             'guest_self_service', 'staff_assisted', 'dsr_erasure', 'policy_version_bump'
                         )),
    ip_address           INET,
    user_agent           TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_consent_records_subject         ON public.consent_records (subject_id, subject_type);
CREATE INDEX IF NOT EXISTS idx_consent_records_active          ON public.consent_records (subject_id, consent_type) WHERE withdrawn_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_consent_records_policy_version  ON public.consent_records (policy_version);

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
-- Tier 6: default-deny. Reads happen via SECURITY DEFINER RPCs (guest session is validated
-- in Server Actions, not at RLS — guests have no auth.uid()). Staff with `hr:r` can audit
-- via `rpc_inspect_consent(...)` if added later.

CREATE TRIGGER trg_consent_records_updated_at
    BEFORE UPDATE ON public.consent_records
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.consent_records IS 'GDPR/BIPA/PDPA consent ledger. Append-and-withdraw only (no UPDATE of granted rows; withdrawal sets withdrawn_at).';


-- =============================================================================
-- 3. biometric_access_log — BIPA immutable audit trail for every vector touch
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.biometric_access_log (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendee_id          UUID NOT NULL REFERENCES public.booking_attendees(id) ON DELETE CASCADE,
    event                TEXT NOT NULL CHECK (event IN (
                             'enroll', 'match_attempt', 'withdraw_and_delete',
                             'auto_delete_retention', 'dsr_erasure'
                         )),
    actor_type           TEXT NOT NULL CHECK (actor_type IN ('guest_self', 'staff', 'system')),
    actor_id             UUID,                       -- auth.uid() when staff-initiated
    match_result         BOOLEAN,                    -- NULL unless event = 'match_attempt'
    confidence_score     NUMERIC,                    -- NULL unless event = 'match_attempt'
    ip_address           INET,
    user_agent           TEXT,
    metadata             JSONB DEFAULT '{}'::JSONB,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_biometric_access_log_attendee ON public.biometric_access_log (attendee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_biometric_access_log_event    ON public.biometric_access_log (event, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_biometric_access_log_actor    ON public.biometric_access_log (actor_id) WHERE actor_id IS NOT NULL;

ALTER TABLE public.biometric_access_log ENABLE ROW LEVEL SECURITY;
-- Immutable: no UPDATE / DELETE policy for any role (except service_role for GDPR erasure).
CREATE POLICY "biometric_access_log_no_update" ON public.biometric_access_log FOR UPDATE TO authenticated, anon USING (false);
CREATE POLICY "biometric_access_log_no_delete" ON public.biometric_access_log FOR DELETE TO authenticated, anon USING (false);

COMMENT ON TABLE public.biometric_access_log IS 'Append-only audit trail for every biometric vector read/write. BIPA §15-compliant. Service-role inserts only.';


-- =============================================================================
-- 4. payment_webhook_events — gateway webhook idempotency ledger
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
    event_id             TEXT PRIMARY KEY,           -- gateway's event id (Stripe evt_..., etc.)
    event_type           TEXT NOT NULL,              -- 'payment_intent.succeeded', '.failed', etc.
    payment_intent_id    TEXT NOT NULL,
    raw_payload          JSONB NOT NULL,
    received_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at         TIMESTAMPTZ,
    processing_attempts  INTEGER NOT NULL DEFAULT 0,
    last_error           TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_intent     ON public.payment_webhook_events (payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_unprocessed ON public.payment_webhook_events (received_at) WHERE processed_at IS NULL;

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
-- Tier 6 default-deny. Service-role only.

COMMENT ON TABLE public.payment_webhook_events IS 'Idempotency ledger for payment-gateway webhooks. event_id unique => duplicate deliveries are no-ops.';


-- =============================================================================
-- 5. payment_webhook_events_dlq — dead-letter queue for repeated failures
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.payment_webhook_events_dlq (
    event_id             TEXT PRIMARY KEY,
    original_event       JSONB NOT NULL,
    failure_count        INTEGER NOT NULL,
    last_error           TEXT NOT NULL,
    moved_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at          TIMESTAMPTZ,
    resolved_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolution_notes     TEXT
);

ALTER TABLE public.payment_webhook_events_dlq ENABLE ROW LEVEL SECURITY;
-- Admins with system:r may read; mutations via service_role only.
CREATE POLICY "pwed_admin_select" ON public.payment_webhook_events_dlq FOR SELECT TO authenticated
    USING (public.is_claims_fresh() AND (auth.jwt()->'app_metadata'->'domains'->'system') ? 'r');

COMMENT ON TABLE public.payment_webhook_events_dlq IS 'Dead-letter queue for payment webhooks exceeding retry budget. SEV-2 alert on insert.';


-- =============================================================================
-- 6. Aggregate VIEWs — kill N+1 patterns in list-with-aggregate routes
-- =============================================================================

-- 6a. v_pos_point_today_stats — consumed by /management/pos
CREATE OR REPLACE VIEW public.v_pos_point_today_stats WITH (security_invoker = true) AS
SELECT
    pp.id                                                                     AS pos_point_id,
    COUNT(o.id)                                                               AS order_count_today,
    COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.total_amount END),0) AS revenue_today,
    MAX(o.created_at)                                                         AS last_order_at
FROM public.pos_points pp
LEFT JOIN public.orders o
       ON o.pos_point_id = pp.id
      AND o.created_at >= (NOW() AT TIME ZONE public.get_app_config('facility_timezone'))::DATE
      AND o.created_at  < ((NOW() AT TIME ZONE public.get_app_config('facility_timezone'))::DATE + INTERVAL '1 day')
GROUP BY pp.id;

COMMENT ON VIEW public.v_pos_point_today_stats IS 'Per-POS-point aggregate for today: order count, revenue, last order time. Single-query fill for /management/pos.';

-- 6b. v_supplier_open_po_stats — consumed by /management/procurement/suppliers
CREATE OR REPLACE VIEW public.v_supplier_open_po_stats WITH (security_invoker = true) AS
SELECT
    s.id                                                         AS supplier_id,
    COUNT(po.id) FILTER (WHERE po.status IN ('sent', 'partially_received'))       AS open_po_count,
    COUNT(po.id) FILTER (WHERE po.status = 'draft')                               AS draft_po_count,
    MAX(po.order_date)                                                            AS last_order_date,
    COUNT(po.id) FILTER (WHERE po.status IN ('sent','partially_received')
                           AND po.expected_delivery_date < CURRENT_DATE)          AS overdue_po_count
FROM public.suppliers s
LEFT JOIN public.purchase_orders po ON po.supplier_id = s.id
GROUP BY s.id;

COMMENT ON VIEW public.v_supplier_open_po_stats IS 'Per-supplier aggregate: open/draft/overdue PO counts and last order date. Single-query fill for /management/procurement/suppliers.';

-- 6c. v_staff_exception_stats — consumed by /management/hr/attendance/queue leaderboard
CREATE OR REPLACE VIEW public.v_staff_exception_stats WITH (security_invoker = true) AS
SELECT
    sr.id                                                            AS staff_record_id,
    COUNT(ae.id) FILTER (WHERE ae.status = 'unjustified')             AS unjustified_count,
    COUNT(ae.id) FILTER (WHERE ae.status = 'justified')               AS justified_count,
    COUNT(ae.id) FILTER (WHERE ae.status = 'unjustified'
                           AND ae.created_at > NOW() - INTERVAL '30 days') AS unjustified_last_30d,
    MAX(ae.created_at)                                                AS last_exception_at
FROM public.staff_records sr
LEFT JOIN public.attendance_exceptions ae ON ae.staff_record_id = sr.id
GROUP BY sr.id;

COMMENT ON VIEW public.v_staff_exception_stats IS 'Per-staff exception aggregates for HR leaderboards. Single-query fill.';


-- =============================================================================
-- 7. rpc_apply_payment_event — webhook commit (service_role only)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_apply_payment_event(
    p_event_id        TEXT,
    p_payment_intent  TEXT,
    p_new_status      public.payment_status,
    p_paid_at         TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_payment   RECORD;
    v_booking   RECORD;
BEGIN
    -- Lock + load webhook-event row (must already exist — Edge Function inserts on receipt)
    SELECT * INTO v_payment
    FROM public.booking_payments
    WHERE payment_intent_id = p_payment_intent
    FOR UPDATE;

    IF v_payment IS NULL THEN
        -- Orphaned webhook — flag on the event row for manual triage
        UPDATE public.payment_webhook_events
           SET last_error = 'ORPHAN_PAYMENT_INTENT',
               processing_attempts = processing_attempts + 1
         WHERE event_id = p_event_id;
        RETURN jsonb_build_object('success', false, 'error', 'ORPHAN_PAYMENT_INTENT');
    END IF;

    UPDATE public.booking_payments
       SET status     = p_new_status,
           paid_at    = COALESCE(p_paid_at, paid_at),
           updated_at = NOW()
     WHERE id = v_payment.id;

    IF p_new_status = 'success' THEN
        UPDATE public.bookings
           SET status     = 'confirmed',
               updated_at = NOW()
         WHERE id = v_payment.booking_id
           AND status = 'pending_payment';
    ELSIF p_new_status = 'failed' THEN
        -- Booking remains 'pending_payment'; abandonment sweep will handle eventual cancel.
        NULL;
    END IF;

    UPDATE public.payment_webhook_events
       SET processed_at        = NOW(),
           processing_attempts = processing_attempts + 1,
           last_error          = NULL
     WHERE event_id = p_event_id;

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_payment.booking_id,
        'status', p_new_status
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_apply_payment_event(TEXT, TEXT, public.payment_status, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
-- service_role only (invoked from confirm-booking-payment Edge Function).

COMMENT ON FUNCTION public.rpc_apply_payment_event(TEXT, TEXT, public.payment_status, TIMESTAMPTZ) IS 'Idempotent webhook-commit RPC. Edge Function only.';


-- =============================================================================
-- 8. rpc_withdraw_biometric_consent — BIPA synchronous withdrawal
-- =============================================================================
-- Atomic: withdraw consent + delete vector + disable attendee Face Pay + log.

CREATE OR REPLACE FUNCTION public.rpc_withdraw_biometric_consent(
    p_attendee_id   UUID,
    p_actor_type    TEXT DEFAULT 'guest_self',   -- 'guest_self' | 'staff' | 'system'
    p_actor_id      UUID DEFAULT NULL,
    p_ip_address    INET DEFAULT NULL,
    p_user_agent    TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    IF p_actor_type NOT IN ('guest_self', 'staff', 'system') THEN
        RAISE EXCEPTION 'INVALID_ACTOR_TYPE';
    END IF;

    UPDATE public.consent_records
       SET withdrawn_at      = NOW(),
           withdrawal_method = CASE
                                   WHEN p_actor_type = 'guest_self' THEN 'guest_self_service'
                                   WHEN p_actor_type = 'staff'      THEN 'staff_assisted'
                                   ELSE 'dsr_erasure'
                               END,
           updated_at        = NOW()
     WHERE subject_id   = p_attendee_id
       AND subject_type = 'booking_attendee'
       AND consent_type = 'biometric_enrollment'
       AND withdrawn_at IS NULL;

    DELETE FROM public.biometric_vectors WHERE attendee_id = p_attendee_id;

    UPDATE public.booking_attendees
       SET face_pay_enabled     = FALSE,
           auto_capture_enabled = FALSE,
           updated_at           = NOW()
     WHERE id = p_attendee_id;

    INSERT INTO public.biometric_access_log (attendee_id, event, actor_type, actor_id, ip_address, user_agent)
    VALUES (p_attendee_id, 'withdraw_and_delete', p_actor_type, p_actor_id, p_ip_address, p_user_agent);

    RETURN jsonb_build_object('success', true, 'attendee_id', p_attendee_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_withdraw_biometric_consent(UUID, TEXT, UUID, INET, TEXT) FROM PUBLIC, anon, authenticated;
-- service_role only. Guest invocation arrives via the Server Action at
-- /my-booking/manage/biometrics, which validates the guest session cookie
-- before calling this RPC.

COMMENT ON FUNCTION public.rpc_withdraw_biometric_consent(UUID, TEXT, UUID, INET, TEXT) IS 'Atomic BIPA-compliant withdrawal: consent -> vector -> attendee flags -> audit log. Service-role only.';


-- =============================================================================
-- 9. rpc_erase_subject — DSR erasure cascade for a booking subject
-- =============================================================================
-- Invoked from the privacy-request workflow. Cascades deletion of identifying
-- data while preserving the audit trail (biometric_access_log rows remain).

CREATE OR REPLACE FUNCTION public.rpc_erase_subject(
    p_booking_id  UUID,
    p_reason      TEXT DEFAULT 'dsr_request'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_attendee   RECORD;
    v_vectors    INTEGER := 0;
    v_photos     INTEGER := 0;
BEGIN
    FOR v_attendee IN
        SELECT id FROM public.booking_attendees WHERE booking_id = p_booking_id
    LOOP
        WITH d AS (
            DELETE FROM public.biometric_vectors WHERE attendee_id = v_attendee.id RETURNING 1
        )
        SELECT v_vectors + COUNT(*) INTO v_vectors FROM d;

        UPDATE public.consent_records
           SET withdrawn_at      = NOW(),
               withdrawal_method = 'dsr_erasure',
               updated_at        = NOW()
         WHERE subject_id = v_attendee.id AND subject_type = 'booking_attendee' AND withdrawn_at IS NULL;

        INSERT INTO public.biometric_access_log (attendee_id, event, actor_type, metadata)
        VALUES (v_attendee.id, 'dsr_erasure', 'system', jsonb_build_object('reason', p_reason, 'booking_id', p_booking_id));
    END LOOP;

    WITH d AS (
        DELETE FROM public.captured_photos WHERE booking_id = p_booking_id RETURNING 1
    )
    SELECT v_photos + COUNT(*) INTO v_photos FROM d;

    -- Anonymize PII on the booking row but keep the record for accounting / audit.
    UPDATE public.bookings
       SET booker_name  = 'ERASED',
           booker_email = 'erased+' || id::text || '@privacy.local',
           booker_phone = 'ERASED',
           updated_at   = NOW()
     WHERE id = p_booking_id;

    RETURN jsonb_build_object(
        'success', true,
        'vectors_deleted', v_vectors,
        'photos_deleted', v_photos
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_erase_subject(UUID, TEXT) FROM PUBLIC, anon, authenticated;
-- service_role only. Invoked from the DSR workflow Server Action (admin-gated).

COMMENT ON FUNCTION public.rpc_erase_subject(UUID, TEXT) IS 'DSR erasure cascade for a booking subject. Service-role only.';


-- =============================================================================
-- 10. cron-payment-reconcile — recover dropped webhooks every 5 min
-- =============================================================================
-- Calls the Edge Function reconcile-payments, which queries the gateway for
-- any booking_payments still 'pending' after 2 min and synthesizes the
-- missing webhook event via rpc_apply_payment_event.

SELECT cron.schedule(
    'cron-payment-reconcile',
    '*/5 * * * *',
    $$SELECT net.http_post(
        url := public.get_app_config('supabase_url') || '/functions/v1/reconcile-payments',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || public.get_vault_secret('cron_secret'),
            'Content-Type',  'application/json'
        ),
        body := '{}'::jsonb
    )$$
);


-- =============================================================================
-- 11. cron-biometric-retention — hourly 24h-post-visit vector purge
-- =============================================================================
-- Stricter than the existing 'purge-expired-biometrics' (daily / 30-day) so the
-- retention window advertised to guests (24h after visit end) is actually met.
-- Each deletion emits a biometric_access_log row for audit continuity.

CREATE OR REPLACE FUNCTION public.fn_biometric_retention_sweep()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_attendee   RECORD;
    v_deleted    INTEGER := 0;
BEGIN
    FOR v_attendee IN
        SELECT DISTINCT bv.attendee_id
        FROM public.biometric_vectors bv
        JOIN public.booking_attendees ba ON ba.id = bv.attendee_id
        JOIN public.bookings          b  ON b.id  = ba.booking_id
        JOIN public.time_slots        ts ON ts.id = b.time_slot_id
        WHERE (ts.slot_date + ts.end_time + INTERVAL '24 hours') < NOW()
          AND NOT EXISTS (
              SELECT 1 FROM public.consent_records c
              WHERE c.subject_id   = ba.id
                AND c.subject_type = 'booking_attendee'
                AND c.consent_type = 'biometric_enrollment'
                AND c.withdrawn_at IS NULL
                AND c.retention_policy <> 'visit_end_plus_24h'
          )
    LOOP
        DELETE FROM public.biometric_vectors WHERE attendee_id = v_attendee.attendee_id;
        v_deleted := v_deleted + 1;

        INSERT INTO public.biometric_access_log (attendee_id, event, actor_type)
        VALUES (v_attendee.attendee_id, 'auto_delete_retention', 'system');

        UPDATE public.consent_records
           SET withdrawn_at      = NOW(),
               withdrawal_method = 'policy_version_bump',
               updated_at        = NOW()
         WHERE subject_id   = v_attendee.attendee_id
           AND subject_type = 'booking_attendee'
           AND consent_type = 'biometric_enrollment'
           AND withdrawn_at IS NULL;
    END LOOP;

    RETURN v_deleted;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_biometric_retention_sweep() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule(
    'cron-biometric-retention',
    '0 * * * *',
    $$SELECT public.fn_biometric_retention_sweep()$$
);

COMMENT ON FUNCTION public.fn_biometric_retention_sweep() IS 'Hourly BIPA/GDPR retention sweep: 24h post visit-end. Emits biometric_access_log rows per deletion.';


-- =============================================================================
-- 12. Cleanup helper — nightly expire of stale idempotency keys
-- =============================================================================

SELECT cron.schedule(
    'cron-idempotency-purge',
    '30 2 * * *',
    $$DELETE FROM public.idempotency_keys WHERE expires_at < NOW()$$
);


-- =============================================================================
-- End of migration 20260418000000_phase2_security_additions.sql
-- =============================================================================
