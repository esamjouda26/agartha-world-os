-- ═══════════════════════════════════════════════════════════════════════════
-- ADR-0007 — Attendance Clarification Workflow
--
-- Expands attendance_exceptions from a binary unjustified|justified toggle
-- into a 4-state staff-initiated escalation workflow with optional document
-- attachments.
--
-- State machine:
--   unjustified    ─[staff submits]────▶ pending_review
--   pending_review ─[HR approves]──────▶ justified
--   pending_review ─[HR rejects]───────▶ rejected
--   rejected       ─[staff resubmits]──▶ pending_review
--   unjustified    ─[HR approves from ledger]──▶ justified  (unilateral)
--
-- Column consolidation (user decision 2026-04-21):
--   justified_by         → reviewed_by
--   justified_at         → reviewed_at
--   justification_reason → hr_note
--   (rejections reuse the same trio; `status` disambiguates approve vs
--    reject.)
--
-- Cache/surface split (ADR-0007):
--   /management/hr/attendance/queue  — status = 'pending_review'
--   /management/hr/attendance/ledger — every exception (incl. unjustified
--                                      for the unilateral-approval path)
--   /crew/attendance?tab=exceptions  — staff's own; submit / resubmit /
--                                      read-only per status
--
-- Same-transaction enum-literal caveat:
--   `ALTER TYPE … ADD VALUE` + later references to the new value in a
--   CHECK constraint or partial-index WHERE clause collide with PG's
--   "can't use freshly-added enum value in same-txn constraints" rule.
--   Sidestepped by writing every constraint/index WHERE predicate as
--   `status::text = '…'` (TEXT literal, no enum-type lookup at parse).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Expand the enum ────────────────────────────────────────────────────
-- Order: unjustified (0) → pending_review (1) → justified (2) → rejected (3)

ALTER TYPE public.exception_status ADD VALUE IF NOT EXISTS 'pending_review' BEFORE 'justified';
ALTER TYPE public.exception_status ADD VALUE IF NOT EXISTS 'rejected' AFTER 'justified';

-- ─── 2. Rename reviewer columns ────────────────────────────────────────────

ALTER TABLE public.attendance_exceptions RENAME COLUMN justified_by        TO reviewed_by;
ALTER TABLE public.attendance_exceptions RENAME COLUMN justified_at        TO reviewed_at;
ALTER TABLE public.attendance_exceptions RENAME COLUMN justification_reason TO hr_note;

ALTER INDEX public.idx_attendance_exceptions_justified_by
    RENAME TO idx_attendance_exceptions_reviewed_by;

-- ─── 3. Add the submission-timestamp column ────────────────────────────────

ALTER TABLE public.attendance_exceptions
    ADD COLUMN clarification_submitted_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.attendance_exceptions.clarification_submitted_at IS
    'public — Stamped when staff submits or resubmits a clarification. NULL while status=unjustified. NOT NULL for pending_review and preserved through justified / rejected terminal states (queue sort + ledger audit trail).';

COMMENT ON COLUMN public.attendance_exceptions.reviewed_by IS
    'internal — HR user who approved or rejected. Paired with reviewed_at + hr_note.';

COMMENT ON COLUMN public.attendance_exceptions.reviewed_at IS
    'internal — Timestamp of HR decision.';

COMMENT ON COLUMN public.attendance_exceptions.hr_note IS
    'public — HR decision note. For justified: justification / linked leave. For rejected: rejection reason shown back to staff. Readable by staff.';

-- ─── 4. Backfill pre-ADR-0007 data ─────────────────────────────────────────
-- The old CHECK allowed `status = 'justified'` rows with a NULL
-- justification_reason (only justified_by + justified_at were required).
-- The new CHECK tightens hr_note to NOT NULL for both justified and
-- rejected terminal states. Backfill a placeholder so the new constraint
-- accepts pre-existing rows. No-op if the project has no prior data.

UPDATE public.attendance_exceptions
SET hr_note = '(pre-ADR-0007; no reason recorded)'
WHERE status::text = 'justified'
  AND hr_note IS NULL;

-- ─── 5. Replace the row-level CHECK constraint ─────────────────────────────
-- The original CHECK was declared inline (anonymous) in CREATE TABLE;
-- PG auto-names anonymous check constraints unpredictably. Discover +
-- drop whichever one exists, then add the new named 4-state invariant.

DO $$
DECLARE
    v_old_check_name TEXT;
BEGIN
    SELECT conname INTO v_old_check_name
    FROM pg_constraint
    WHERE conrelid = 'public.attendance_exceptions'::regclass
      AND contype = 'c'
      AND conname <> 'attendance_exceptions_state_check'
    ORDER BY conname
    LIMIT 1;
    IF v_old_check_name IS NOT NULL THEN
        EXECUTE format(
            'ALTER TABLE public.attendance_exceptions DROP CONSTRAINT %I',
            v_old_check_name
        );
    END IF;
END $$;

ALTER TABLE public.attendance_exceptions
    ADD CONSTRAINT attendance_exceptions_state_check CHECK (
        (status::text = 'unjustified' AND
            clarification_submitted_at IS NULL AND
            reviewed_at IS NULL AND reviewed_by IS NULL AND hr_note IS NULL)
        OR
        (status::text = 'pending_review' AND
            clarification_submitted_at IS NOT NULL AND
            staff_clarification IS NOT NULL AND
            reviewed_at IS NULL AND reviewed_by IS NULL)
        OR
        (status::text = 'justified' AND
            reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL AND hr_note IS NOT NULL)
        OR
        (status::text = 'rejected' AND
            reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL AND hr_note IS NOT NULL AND
            clarification_submitted_at IS NOT NULL AND
            staff_clarification IS NOT NULL)
    );

-- ─── 6. Composite index for the HR queue surface ──────────────────────────
-- Queue query: WHERE status='pending_review' ORDER BY clarification_submitted_at DESC
--
-- A partial index with `WHERE status = 'pending_review'` is rejected
-- (SQLSTATE 42P17: functions in index predicate must be marked
-- IMMUTABLE — the enum cast path is STABLE). A partial index with a
-- NULL-based substitute predicate would work but the planner wouldn't
-- pick it up for `WHERE status = 'pending_review'` queries unless those
-- queries repeat the NULL predicate — planner doesn't consult CHECK
-- constraints for index matching.
--
-- Composite `(status, clarification_submitted_at DESC NULLS LAST)` is
-- the robust choice. The queue query hits a narrow slice of the index
-- (status = 'pending_review' prefix), indexed-scan into the date ordering.
-- Storage cost scales with total exception count but is trivial at the
-- app's expected cardinality.

CREATE INDEX idx_attendance_exceptions_queue
    ON public.attendance_exceptions (status, clarification_submitted_at DESC NULLS LAST);

-- ─── 7. Clarification attachments table ────────────────────────────────────
-- Append-only: no UPDATE / DELETE policy. MC, receipts, photos remain
-- accessible for audit per user decision 2026-04-21 (“save without
-- deletion”). CLAUDE.md §15 retention: employment + 7 years.

CREATE TABLE public.attendance_clarification_attachments (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exception_id     UUID NOT NULL REFERENCES public.attendance_exceptions(id) ON DELETE CASCADE,
    file_path        TEXT NOT NULL,
    file_name        TEXT NOT NULL,
    mime_type        TEXT NOT NULL,
    file_size_bytes  INTEGER NOT NULL CHECK (file_size_bytes > 0),
    created_by       UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (exception_id, file_path)
);

COMMENT ON TABLE public.attendance_clarification_attachments IS
    'restricted — Medical certificates, receipts, photos attached to attendance clarifications. Append-only (no UPDATE / DELETE policy). Retention: employment duration + 7 years per CLAUDE.md §15.';

COMMENT ON COLUMN public.attendance_clarification_attachments.file_path IS
    'restricted — Path relative to `attendance-clarifications` bucket root (shape: {staff_record_id}/{exception_id}/{uuid}.{ext}). Access via signed URL, TTL ≤ 15min.';

CREATE INDEX idx_attendance_clarification_attachments_exception_id
    ON public.attendance_clarification_attachments(exception_id);

ALTER TABLE public.attendance_clarification_attachments ENABLE ROW LEVEL SECURITY;

-- SELECT: owner of parent exception OR any HR reader (claims-fresh).
CREATE POLICY "attendance_clarification_attachments_select"
    ON public.attendance_clarification_attachments FOR SELECT TO authenticated
    USING (
        public.is_claims_fresh()
        AND (
            EXISTS (
                SELECT 1
                FROM public.attendance_exceptions ae
                JOIN public.profiles p ON p.staff_record_id = ae.staff_record_id
                WHERE ae.id = attendance_clarification_attachments.exception_id
                  AND p.id = (SELECT auth.uid())
            )
            OR (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'r'
        )
    );

-- INSERT: only the owner of the parent exception. Enforces created_by =
-- auth.uid() at write time so the column behaves as NOT NULL in practice
-- (the FK keeps ON DELETE SET NULL for offboarding).
CREATE POLICY "attendance_clarification_attachments_insert"
    ON public.attendance_clarification_attachments FOR INSERT TO authenticated
    WITH CHECK (
        public.is_claims_fresh()
        AND created_by = (SELECT auth.uid())
        AND EXISTS (
            SELECT 1
            FROM public.attendance_exceptions ae
            JOIN public.profiles p ON p.staff_record_id = ae.staff_record_id
            WHERE ae.id = attendance_clarification_attachments.exception_id
              AND p.id = (SELECT auth.uid())
        )
    );

-- No UPDATE / DELETE policies → denied by default.

-- ─── 8. Storage bucket ─────────────────────────────────────────────────────
-- attendance-clarifications: private, 10MB cap, image/* + PDF.
-- Path convention: {staff_record_id}/{exception_id}/{uuid}.{ext}

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'attendance-clarifications',
    'attendance-clarifications',
    FALSE,
    10 * 1024 * 1024,
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/heic',
        'application/pdf'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public             = EXCLUDED.public,
    file_size_limit    = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies follow the existing project pattern (text
-- comparison via owner_id, folder check via storage.foldername).

CREATE POLICY "attendance_clarifications_select"
    ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'attendance-clarifications'
        AND (
            owner_id = (SELECT auth.uid())::text
            OR (auth.jwt()->'app_metadata'->'domains'->'hr') ? 'r'
        )
    );

CREATE POLICY "attendance_clarifications_insert"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'attendance-clarifications'
        AND (storage.foldername(name))[1] = (
            SELECT staff_record_id::text
            FROM public.profiles
            WHERE id = (SELECT auth.uid())
        )
    );

-- No UPDATE / DELETE policies → immutable storage.

-- ─── 9. Drop the old clarification RPC ─────────────────────────────────────

DROP FUNCTION IF EXISTS public.rpc_add_exception_clarification(UUID, TEXT);

-- ─── 10. Staff submit / resubmit RPC ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.rpc_submit_exception_clarification(
    p_exception_id      UUID,
    p_text              TEXT,
    p_attachment_paths  TEXT[] DEFAULT '{}'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_user_id            UUID := (SELECT auth.uid());
    v_staff_record_id    UUID;
    v_exception_staff_id UUID;
    v_current_status     public.exception_status;
    v_path               TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHENTICATED';
    END IF;
    IF p_text IS NULL OR length(trim(p_text)) < 3 THEN
        RAISE EXCEPTION 'VALIDATION_FAILED: clarification text required (min 3 chars)';
    END IF;

    SELECT staff_record_id INTO v_staff_record_id
    FROM public.profiles WHERE id = v_user_id;
    IF v_staff_record_id IS NULL THEN
        RAISE EXCEPTION 'FORBIDDEN: STAFF_RECORD_NOT_LINKED';
    END IF;

    SELECT staff_record_id, status
    INTO v_exception_staff_id, v_current_status
    FROM public.attendance_exceptions
    WHERE id = p_exception_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: EXCEPTION_NOT_FOUND: %', p_exception_id;
    END IF;
    IF v_exception_staff_id <> v_staff_record_id THEN
        RAISE EXCEPTION 'FORBIDDEN: not your exception';
    END IF;
    IF v_current_status::text NOT IN ('unjustified', 'pending_review', 'rejected') THEN
        RAISE EXCEPTION 'CONFLICT: cannot submit from status=%', v_current_status;
    END IF;

    UPDATE public.attendance_exceptions
    SET staff_clarification        = p_text,
        status                     = 'pending_review'::public.exception_status,
        clarification_submitted_at = NOW(),
        reviewed_by                = NULL,
        reviewed_at                = NULL,
        hr_note                    = NULL,
        updated_at                 = NOW(),
        updated_by                 = v_user_id
    WHERE id = p_exception_id;

    -- Link any newly uploaded attachments. The app layer has uploaded the
    -- blobs to attendance-clarifications/{staff_record_id}/{exception_id}/…
    -- first; we pull metadata back from storage.objects here. Storage-
    -- layer RLS (policy in §8) already enforces owner-folder writes;
    -- this RPC double-checks to prevent forged paths pointing at blobs
    -- the caller didn't upload.
    IF array_length(p_attachment_paths, 1) IS NOT NULL THEN
        FOREACH v_path IN ARRAY p_attachment_paths LOOP
            IF (string_to_array(v_path, '/'))[1] <> v_staff_record_id::text THEN
                RAISE EXCEPTION 'FORBIDDEN: attachment path not in owner folder';
            END IF;

            INSERT INTO public.attendance_clarification_attachments
                (exception_id, file_path, file_name, mime_type, file_size_bytes, created_by)
            SELECT
                p_exception_id,
                v_path,
                split_part(v_path, '/', array_length(string_to_array(v_path, '/'), 1)),
                COALESCE(so.metadata->>'mimetype', 'application/octet-stream'),
                COALESCE((so.metadata->>'size')::INTEGER, 0),
                v_user_id
            FROM storage.objects so
            WHERE so.bucket_id = 'attendance-clarifications'
              AND so.name = v_path
            ON CONFLICT (exception_id, file_path) DO NOTHING;
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'exception_id',     p_exception_id,
        'status',           'pending_review',
        'attachment_count', (
            SELECT count(*) FROM public.attendance_clarification_attachments
            WHERE exception_id = p_exception_id
        )
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_submit_exception_clarification FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.rpc_submit_exception_clarification TO authenticated;

COMMENT ON FUNCTION public.rpc_submit_exception_clarification IS
    'Staff-only. Submit or resubmit a clarification on an own exception. Transitions unjustified|pending_review|rejected → pending_review, stamps clarification_submitted_at, clears prior reviewer fields, links uploaded attachments idempotently.';

-- ─── 11. HR reject RPC ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.rpc_reject_exception_clarification(
    p_exception_id UUID,
    p_reason       TEXT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_user_id        UUID := (SELECT auth.uid());
    v_current_status public.exception_status;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHENTICATED';
    END IF;
    IF NOT ((auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u') THEN
        RAISE EXCEPTION 'FORBIDDEN: hr:u required';
    END IF;
    IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
        RAISE EXCEPTION 'VALIDATION_FAILED: rejection reason required (min 3 chars)';
    END IF;

    SELECT status INTO v_current_status
    FROM public.attendance_exceptions
    WHERE id = p_exception_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: EXCEPTION_NOT_FOUND: %', p_exception_id;
    END IF;
    IF v_current_status::text <> 'pending_review' THEN
        RAISE EXCEPTION 'CONFLICT: reject requires pending_review; current=%', v_current_status;
    END IF;

    UPDATE public.attendance_exceptions
    SET status       = 'rejected'::public.exception_status,
        hr_note      = p_reason,
        reviewed_by  = v_user_id,
        reviewed_at  = NOW(),
        updated_at   = NOW(),
        updated_by   = v_user_id
    WHERE id = p_exception_id;

    RETURN jsonb_build_object('exception_id', p_exception_id, 'status', 'rejected');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_reject_exception_clarification FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.rpc_reject_exception_clarification TO authenticated;

COMMENT ON FUNCTION public.rpc_reject_exception_clarification IS
    'HR-only. Reject a pending_review clarification; reason stored in hr_note. Staff may resubmit via rpc_submit_exception_clarification (→ pending_review).';

-- ─── 12. HR justify RPC (unilateral OR in response to submission) ──────────

CREATE OR REPLACE FUNCTION public.rpc_justify_exception(
    p_exception_id UUID,
    p_reason       TEXT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_user_id        UUID := (SELECT auth.uid());
    v_current_status public.exception_status;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHENTICATED';
    END IF;
    IF NOT ((auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u') THEN
        RAISE EXCEPTION 'FORBIDDEN: hr:u required';
    END IF;
    IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
        RAISE EXCEPTION 'VALIDATION_FAILED: justification reason required (min 3 chars)';
    END IF;

    SELECT status INTO v_current_status
    FROM public.attendance_exceptions
    WHERE id = p_exception_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: EXCEPTION_NOT_FOUND: %', p_exception_id;
    END IF;
    -- HR may approve unilaterally from the ledger (unjustified source —
    -- e.g., broad system outage) OR in response to a submission
    -- (pending_review source). Rejected rows must be resubmitted first.
    IF v_current_status::text NOT IN ('unjustified', 'pending_review') THEN
        RAISE EXCEPTION 'CONFLICT: cannot justify from status=%', v_current_status;
    END IF;

    UPDATE public.attendance_exceptions
    SET status       = 'justified'::public.exception_status,
        hr_note      = p_reason,
        reviewed_by  = v_user_id,
        reviewed_at  = NOW(),
        updated_at   = NOW(),
        updated_by   = v_user_id
    WHERE id = p_exception_id;

    RETURN jsonb_build_object('exception_id', p_exception_id, 'status', 'justified');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_justify_exception FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.rpc_justify_exception TO authenticated;

COMMENT ON FUNCTION public.rpc_justify_exception IS
    'HR-only. Approve an exception from unjustified (unilateral — ledger row action) or pending_review (queue row action). Mirrors rpc_reject_exception_clarification for audit symmetry.';

-- ─── 13. Update rpc_convert_exception_to_leave for new state + columns ─────

CREATE OR REPLACE FUNCTION public.rpc_convert_exception_to_leave(
    p_exception_id  UUID,
    p_leave_type_id UUID,
    p_days          NUMERIC DEFAULT 1,
    p_note          TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_exception        RECORD;
    v_shift_date       DATE;
    v_staff_record_id  UUID;
    v_leave_type_name  TEXT;
    v_leave_request_id UUID;
BEGIN
    IF NOT ((auth.jwt()->'app_metadata'->'domains'->'hr') ? 'u') THEN
        RAISE EXCEPTION 'Forbidden: hr:u required';
    END IF;

    SELECT ae.id, ae.staff_record_id, ae.type, ae.status, ae.shift_schedule_id
    INTO v_exception
    FROM public.attendance_exceptions ae
    WHERE ae.id = p_exception_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'EXCEPTION_NOT_FOUND: %', p_exception_id;
    END IF;

    -- Widened (ADR-0007): pending_review is now a valid source too.
    IF v_exception.status::text NOT IN ('unjustified', 'pending_review') THEN
        RAISE EXCEPTION 'EXCEPTION_ALREADY_RESOLVED: status=%', v_exception.status;
    END IF;

    IF v_exception.type NOT IN ('absent', 'missing_clock_in') THEN
        RAISE EXCEPTION 'INVALID_EXCEPTION_TYPE: % — only absent or missing_clock_in can be converted', v_exception.type;
    END IF;

    SELECT ss.shift_date INTO v_shift_date
    FROM public.shift_schedules ss WHERE ss.id = v_exception.shift_schedule_id;
    v_staff_record_id := v_exception.staff_record_id;

    SELECT lt.name INTO v_leave_type_name
    FROM public.leave_types lt WHERE lt.id = p_leave_type_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'LEAVE_TYPE_NOT_FOUND: %', p_leave_type_id;
    END IF;

    INSERT INTO public.leave_requests (
        staff_record_id, leave_type_id, start_date, end_date, requested_days,
        status, reviewed_by, reviewed_at, reason
    ) VALUES (
        v_staff_record_id, p_leave_type_id, v_shift_date, v_shift_date, p_days,
        'approved', (SELECT auth.uid()), NOW(),
        COALESCE(p_note, 'Converted from attendance exception')
    )
    RETURNING id INTO v_leave_request_id;

    INSERT INTO public.leave_ledger (
        staff_record_id, leave_type_id, fiscal_year, transaction_date,
        transaction_type, days, leave_request_id, org_unit_path, notes
    ) VALUES (
        v_staff_record_id, p_leave_type_id,
        EXTRACT(YEAR FROM v_shift_date)::INTEGER, CURRENT_DATE,
        'usage', -(p_days), v_leave_request_id,
        NULL,
        'Auto-debit: converted from attendance exception'
    );

    UPDATE public.attendance_exceptions
    SET status      = 'justified'::public.exception_status,
        hr_note     = 'Converted to ' || v_leave_type_name,
        reviewed_by = (SELECT auth.uid()),
        reviewed_at = NOW(),
        updated_at  = NOW(),
        updated_by  = (SELECT auth.uid())
    WHERE id = p_exception_id;

    RETURN v_leave_request_id;
END;
$$;

-- ─── 14. Rebind _report_exception_report to the renamed column ─────────────
-- Function bodies store column names as static text; RENAME COLUMN does
-- not rewrite them. Without this CREATE OR REPLACE, the next call to
-- rpc_run_report('exception_report', …) would throw
--   "column ae.justification_reason does not exist".

CREATE OR REPLACE FUNCTION public._report_exception_report(p_params JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_start DATE; v_end DATE; v_org_unit_id UUID;
BEGIN
    SELECT range_start, range_end INTO v_start, v_end FROM public._report_date_range(p_params);
    v_org_unit_id := (p_params->>'org_unit_id')::UUID;
    RETURN COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT sr.id AS staff_record_id, p.display_name, ss.shift_date,
               ae.type, ae.detail, ae.status, ae.hr_note
        FROM public.attendance_exceptions ae
        JOIN public.shift_schedules ss ON ss.id = ae.shift_schedule_id
        JOIN public.staff_records sr   ON sr.id = ss.staff_record_id
        JOIN public.profiles p         ON p.staff_record_id = sr.id
        WHERE ss.shift_date BETWEEN v_start AND v_end
          AND (v_org_unit_id IS NULL OR sr.org_unit_id = v_org_unit_id)
        ORDER BY ss.shift_date, p.display_name
    ) t), '[]'::JSONB);
END;
$$;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- End of migration. App-layer updates (action rename, upload util, HR
-- queue/ledger surfaces, UI state-aware affordances) land in a separate
-- commit once `pnpm db:types` regenerates the row types.
-- ═══════════════════════════════════════════════════════════════════════════
