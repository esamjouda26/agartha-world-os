-- rpc_get_active_staff — currently clocked-in staff, for
-- `/management/staffing` (TodaysCrewGrid).
--
-- Why an RPC: `shift_schedules` / `timecard_punches` / `staff_records`
-- all gate SELECT on `hr:r` (Tier-4 RLS with org_unit_path ancestry
-- check). `v_shift_attendance` is `security_invoker = true`, inheriting
-- those gates. Non-HR managers (POS/ops/procurement/etc.) therefore
-- see zero rows through any direct query, even though spec §3h gives
-- them `/management/staffing` access. This SECURITY DEFINER RPC
-- bypasses the RLS after checking `reports:r` (every manager + admin
-- holds it per seed; no crew does — confirmed at init_schema.sql:775-869).
--
-- Returns: flat join of staff_records + profiles + roles + org_units +
-- v_shift_attendance, filtered to `shift_date = CURRENT_DATE` and
-- `derived_status = 'in_progress'` (clocked in, not yet clocked out).
--
-- No mutations; purely read. STABLE + SECURITY DEFINER + empty
-- search_path per CLAUDE.md §2 hardening.

CREATE OR REPLACE FUNCTION public.rpc_get_active_staff()
RETURNS TABLE (
    staff_record_id UUID,
    profile_id UUID,
    display_name TEXT,
    employee_id TEXT,
    role_id UUID,
    role_name TEXT,
    role_display_name TEXT,
    org_unit_id UUID,
    org_unit_name TEXT,
    clocked_in_at TIMESTAMPTZ,
    shift_expected_end_time TIME,
    shift_name TEXT,
    shift_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
    -- Gate: reports:r — held by every manager + admin, no crew.
    IF NOT ((SELECT auth.jwt()) -> 'app_metadata' -> 'domains' -> 'reports' ? 'r') THEN
        RAISE EXCEPTION 'FORBIDDEN: /management/staffing requires reports:r'
            USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        sr.id                    AS staff_record_id,
        p.id                     AS profile_id,
        p.display_name,
        p.employee_id,
        r.id                     AS role_id,
        r.name                   AS role_name,
        r.display_name           AS role_display_name,
        ou.id                    AS org_unit_id,
        ou.name                  AS org_unit_name,
        va.first_in              AS clocked_in_at,
        va.expected_end_time     AS shift_expected_end_time,
        va.shift_name,
        va.shift_code
    FROM public.v_shift_attendance va
    JOIN public.staff_records sr ON sr.id = va.staff_record_id
    JOIN public.profiles p ON p.staff_record_id = sr.id
    LEFT JOIN public.roles r ON r.id = p.role_id
    LEFT JOIN public.org_units ou ON ou.id = sr.org_unit_id
    WHERE va.shift_date = CURRENT_DATE
      AND va.derived_status = 'in_progress'
    ORDER BY va.first_in DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_get_active_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_active_staff() TO authenticated;

COMMENT ON FUNCTION public.rpc_get_active_staff() IS
'Returns currently-clocked-in staff for the /management/staffing surface. Requires reports:r (managers + admins only). SECURITY DEFINER bypass of Tier-4 hr:r RLS on the underlying shift/punch tables.';
