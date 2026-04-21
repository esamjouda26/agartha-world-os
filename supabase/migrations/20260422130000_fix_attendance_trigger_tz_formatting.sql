-- ═══════════════════════════════════════════════════════════════════════════
-- Fix: attendance trigger TZ formatting
--
-- Seven identical bugs across two trigger functions: `to_char(TIMESTAMPTZ,
-- pattern)` was called without `AT TIME ZONE v_tz`, so PG rendered using
-- the session TZ (UTC on Supabase) instead of the facility TZ. Symptom
-- observed on a late_arrival exception:
--   "Clocked in at 09:22 (Expected: 01:00)"
-- where 01:00 UTC = 09:00 Malaysia — shift start rendered 8h behind.
--
-- The punch-time side was always correct (used `AT TIME ZONE v_tz`
-- explicitly); only the expected-time + cutoff-time sides were wrong.
--
-- This migration `CREATE OR REPLACE`s both trigger functions with the fix
-- and backfills every affected `attendance_exceptions.detail` string from
-- the joined shift + punch data (Option B per the user decision —
-- pre-production means we can clean up historical strings without audit
-- concerns).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Fix trg_validate_punch_window ──────────────────────────────────────
-- 5 call sites corrected (lines in error messages raised to the client).

CREATE OR REPLACE FUNCTION public.trg_validate_punch_window()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_shift_date DATE; v_start_time TIME; v_end_time TIME;
    v_max_early INTEGER; v_max_late INTEGER; v_max_late_in INTEGER;
    v_start_ts TIMESTAMPTZ; v_end_ts TIMESTAMPTZ;
    v_tz TEXT := public.get_app_config('facility_timezone');
BEGIN
    SELECT ss.shift_date, ss.expected_start_time, ss.expected_end_time,
           st.max_early_clock_in_minutes, st.max_late_clock_out_minutes, st.max_late_clock_in_minutes
    INTO v_shift_date, v_start_time, v_end_time, v_max_early, v_max_late, v_max_late_in
    FROM public.shift_schedules ss JOIN public.shift_types st ON st.id = ss.shift_type_id
    WHERE ss.id = NEW.shift_schedule_id;

    IF v_start_time IS NULL THEN RETURN NEW; END IF;
    v_start_ts := (v_shift_date + v_start_time) AT TIME ZONE v_tz;
    IF v_end_time IS NOT NULL THEN
        IF v_end_time < v_start_time THEN
            v_end_ts := ((v_shift_date + INTERVAL '1 day') + v_end_time) AT TIME ZONE v_tz;
        ELSE
            v_end_ts := (v_shift_date + v_end_time) AT TIME ZONE v_tz;
        END IF;
    END IF;

    IF NEW.punch_type = 'clock_in' THEN
        IF NEW.punch_time < (v_start_ts - (v_max_early || ' minutes')::INTERVAL) THEN
            RAISE EXCEPTION 'PUNCH_TOO_EARLY: Shift starts at %, earliest allowed is %.',
                to_char(v_start_ts AT TIME ZONE v_tz, 'HH24:MI'),
                to_char((v_start_ts - (v_max_early || ' minutes')::INTERVAL) AT TIME ZONE v_tz, 'HH24:MI');
        END IF;
        IF NEW.source != 'manual' AND
           NEW.punch_time > (v_start_ts + (v_max_late_in || ' minutes')::INTERVAL) THEN
            RAISE EXCEPTION 'CLOCK_IN_WINDOW_EXPIRED: Clock-in cutoff was %. Use manual entry.',
                to_char((v_start_ts + (v_max_late_in || ' minutes')::INTERVAL) AT TIME ZONE v_tz, 'HH24:MI');
        END IF;
    END IF;

    IF NEW.punch_type = 'clock_out' AND v_end_ts IS NOT NULL THEN
        IF NEW.punch_time > (v_end_ts + (v_max_late || ' minutes')::INTERVAL) THEN
            RAISE EXCEPTION 'PUNCH_TOO_LATE: Shift ended at %, latest allowed is %.',
                to_char(v_end_ts AT TIME ZONE v_tz, 'HH24:MI'),
                to_char((v_end_ts + (v_max_late || ' minutes')::INTERVAL) AT TIME ZONE v_tz, 'HH24:MI');
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- ─── 2. Fix trg_detect_discrepancies ───────────────────────────────────────
-- 2 call sites corrected (in the `detail` strings persisted on exception
-- rows). Punch-time + clock-out-without-prior-clock-in strings already
-- correct; preserved as-is.

CREATE OR REPLACE FUNCTION public.trg_detect_discrepancies()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_shift_date DATE; v_start_time TIME; v_end_time TIME;
    v_grace_late INTEGER; v_grace_early INTEGER;
    v_start_ts TIMESTAMPTZ; v_end_ts TIMESTAMPTZ; v_diff_minutes INTEGER;
    v_tz TEXT := public.get_app_config('facility_timezone');
    v_staff_record_id UUID; v_org_unit_path extensions.ltree;
BEGIN
    IF NEW.voided_at IS NOT NULL THEN RETURN NEW; END IF;

    SELECT ss.shift_date, ss.expected_start_time, ss.expected_end_time,
           st.grace_late_arrival_minutes, st.grace_early_departure_minutes
    INTO v_shift_date, v_start_time, v_end_time, v_grace_late, v_grace_early
    FROM public.shift_schedules ss JOIN public.shift_types st ON st.id = ss.shift_type_id
    WHERE ss.id = NEW.shift_schedule_id;

    IF v_start_time IS NULL THEN RETURN NEW; END IF;
    v_start_ts := (v_shift_date + v_start_time) AT TIME ZONE v_tz;
    IF v_end_time IS NOT NULL THEN
        IF v_end_time < v_start_time THEN
            v_end_ts := ((v_shift_date + INTERVAL '1 day') + v_end_time) AT TIME ZONE v_tz;
        ELSE
            v_end_ts := (v_shift_date + v_end_time) AT TIME ZONE v_tz;
        END IF;
    END IF;

    v_staff_record_id := NEW.staff_record_id;
    SELECT sr.org_unit_path INTO v_org_unit_path
    FROM public.staff_records sr WHERE sr.id = v_staff_record_id;

    IF NEW.punch_type = 'clock_in' THEN
        IF NEW.punch_time > (v_start_ts + (v_grace_late || ' minutes')::INTERVAL) THEN
            v_diff_minutes := EXTRACT(EPOCH FROM (NEW.punch_time - v_start_ts))::INTEGER / 60;
            INSERT INTO public.attendance_exceptions (shift_schedule_id, staff_record_id, org_unit_path, type, detail, status)
            VALUES (NEW.shift_schedule_id, v_staff_record_id, v_org_unit_path,
                'late_arrival'::public.exception_type,
                'Late by ' || v_diff_minutes || ' min. Clocked in at ' ||
                    to_char(NEW.punch_time AT TIME ZONE v_tz, 'HH24:MI') ||
                    ' (Expected: ' || to_char(v_start_ts AT TIME ZONE v_tz, 'HH24:MI') || ')',
                'unjustified'::public.exception_status
            ) ON CONFLICT (shift_schedule_id, type) DO NOTHING;
        END IF;
    END IF;

    IF NEW.punch_type = 'clock_out' AND v_end_ts IS NOT NULL THEN
        IF NEW.punch_time < (v_end_ts - (v_grace_early || ' minutes')::INTERVAL) THEN
            v_diff_minutes := EXTRACT(EPOCH FROM (v_end_ts - NEW.punch_time))::INTEGER / 60;
            INSERT INTO public.attendance_exceptions (shift_schedule_id, staff_record_id, org_unit_path, type, detail, status)
            VALUES (NEW.shift_schedule_id, v_staff_record_id, v_org_unit_path,
                'early_departure'::public.exception_type,
                'Early by ' || v_diff_minutes || ' min. Clocked out at ' ||
                    to_char(NEW.punch_time AT TIME ZONE v_tz, 'HH24:MI') ||
                    ' (Expected: ' || to_char(v_end_ts AT TIME ZONE v_tz, 'HH24:MI') || ')',
                'unjustified'::public.exception_status
            ) ON CONFLICT (shift_schedule_id, type) DO NOTHING;
        END IF;
    END IF;

    IF NEW.punch_type = 'clock_out' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.timecard_punches tp2
            WHERE tp2.shift_schedule_id = NEW.shift_schedule_id
              AND tp2.punch_type = 'clock_in' AND tp2.voided_at IS NULL AND tp2.id != NEW.id
        ) THEN
            INSERT INTO public.attendance_exceptions (shift_schedule_id, staff_record_id, org_unit_path, type, detail, status)
            VALUES (NEW.shift_schedule_id, v_staff_record_id, v_org_unit_path,
                'missing_clock_in'::public.exception_type,
                'Staff clocked out at ' || to_char(NEW.punch_time AT TIME ZONE v_tz, 'HH24:MI') ||
                    ' without a prior clock-in',
                'unjustified'::public.exception_status
            ) ON CONFLICT (shift_schedule_id, type) DO NOTHING;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- ─── 3. Backfill historical `detail` strings (Option B) ────────────────────
-- Re-render every `late_arrival` + `early_departure` row's `detail` from
-- the joined shift + punch data using the fixed formatter. No-op for
-- rows that lack a matching non-voided punch (shouldn't happen in
-- practice; defensive).
--
-- Rationale for inline UPDATE vs. re-firing the trigger: the trigger
-- fires on INSERT only; re-firing would require voiding + re-inserting
-- each punch, which risks data loss and is far more invasive than
-- rewriting a free-text display column.

DO $$
DECLARE
    v_tz TEXT := public.get_app_config('facility_timezone');
BEGIN
    -- late_arrival: use the earliest non-voided clock_in punch for the
    -- parent shift as the "actual" time, shift_types.grace_late_arrival
    -- already determined the exception exists, so just recompute display.
    UPDATE public.attendance_exceptions ae
    SET detail = 'Late by ' ||
        (EXTRACT(EPOCH FROM (
            punches.first_clock_in - ((ss.shift_date + ss.expected_start_time) AT TIME ZONE v_tz)
        ))::INTEGER / 60)::TEXT ||
        ' min. Clocked in at ' || to_char(punches.first_clock_in AT TIME ZONE v_tz, 'HH24:MI') ||
        ' (Expected: ' || to_char(((ss.shift_date + ss.expected_start_time) AT TIME ZONE v_tz) AT TIME ZONE v_tz, 'HH24:MI') || ')'
    FROM public.shift_schedules ss
    JOIN LATERAL (
        SELECT MIN(tp.punch_time) AS first_clock_in
        FROM public.timecard_punches tp
        WHERE tp.shift_schedule_id = ss.id
          AND tp.punch_type = 'clock_in'
          AND tp.voided_at IS NULL
    ) punches ON TRUE
    WHERE ae.shift_schedule_id = ss.id
      AND ae.type = 'late_arrival'
      AND punches.first_clock_in IS NOT NULL;

    -- early_departure: use the latest non-voided clock_out punch as the
    -- "actual" time. End-of-shift crosses midnight handling mirrors the
    -- trigger body.
    UPDATE public.attendance_exceptions ae
    SET detail = 'Early by ' ||
        (EXTRACT(EPOCH FROM (
            (CASE
                WHEN st.end_time < st.start_time
                    THEN ((ss.shift_date + INTERVAL '1 day') + ss.expected_end_time) AT TIME ZONE v_tz
                ELSE (ss.shift_date + ss.expected_end_time) AT TIME ZONE v_tz
            END) - punches.last_clock_out
        ))::INTEGER / 60)::TEXT ||
        ' min. Clocked out at ' || to_char(punches.last_clock_out AT TIME ZONE v_tz, 'HH24:MI') ||
        ' (Expected: ' || to_char(
            (CASE
                WHEN st.end_time < st.start_time
                    THEN ((ss.shift_date + INTERVAL '1 day') + ss.expected_end_time) AT TIME ZONE v_tz
                ELSE (ss.shift_date + ss.expected_end_time) AT TIME ZONE v_tz
            END) AT TIME ZONE v_tz, 'HH24:MI') || ')'
    FROM public.shift_schedules ss
    JOIN public.shift_types st ON st.id = ss.shift_type_id
    JOIN LATERAL (
        SELECT MAX(tp.punch_time) AS last_clock_out
        FROM public.timecard_punches tp
        WHERE tp.shift_schedule_id = ss.id
          AND tp.punch_type = 'clock_out'
          AND tp.voided_at IS NULL
    ) punches ON TRUE
    WHERE ae.shift_schedule_id = ss.id
      AND ae.type = 'early_departure'
      AND punches.last_clock_out IS NOT NULL;
END $$;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- End of migration. The app-side facility-TZ formatter hardening lands
-- in a separate commit.
-- ═══════════════════════════════════════════════════════════════════════════
