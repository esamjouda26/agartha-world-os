-- rpc_get_maintenance_sponsors — staff eligible to sponsor a maintenance
-- work order, for the sponsor SearchableSelect on
-- `/management/maintenance/orders` (frontend_spec.md:2689 — "When on-site:
-- crew sponsor required (select from staff with `maintenance:c`)").
--
-- Why an RPC: the picker needs `staff_records` (Tier-4 hr:r) joined with
-- `role_domain_permissions` (system:r). A maintenance manager holds
-- neither domain, so a direct SELECT returns zero rows. SECURITY DEFINER
-- bypasses both gates after checking the caller holds `maintenance:c`
-- (init_schema.sql:737 — maintenance_manager seed).
--
-- Returns: every active staff record whose role grants
-- `role_domain_permissions.can_create = TRUE` for the maintenance domain.
-- Includes the manager themselves so a maintenance manager who is also
-- on-site can self-sponsor (init_schema.sql:737 grants maintenance:c).

CREATE OR REPLACE FUNCTION public.rpc_get_maintenance_sponsors()
RETURNS TABLE (
    staff_record_id UUID,
    profile_id UUID,
    display_name TEXT,
    employee_id TEXT,
    role_display_name TEXT,
    org_unit_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
    -- Gate: maintenance:c — every maintenance manager + crew with
    -- maintenance domain holds this.
    IF NOT ((SELECT auth.jwt()) -> 'app_metadata' -> 'domains' -> 'maintenance' ? 'c') THEN
        RAISE EXCEPTION 'FORBIDDEN: rpc_get_maintenance_sponsors requires maintenance:c'
            USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        sr.id                  AS staff_record_id,
        p.id                   AS profile_id,
        p.display_name,
        p.employee_id,
        r.display_name         AS role_display_name,
        ou.name                AS org_unit_name
    FROM public.staff_records sr
    JOIN public.profiles p ON p.staff_record_id = sr.id
    JOIN public.roles r ON r.id = p.role_id
    JOIN public.permission_domains pd ON pd.name = 'maintenance'
    JOIN public.role_domain_permissions rdp
        ON rdp.role_id = r.id
       AND rdp.domain_id = pd.id
    LEFT JOIN public.org_units ou ON ou.id = sr.org_unit_id
    WHERE sr.employment_status = 'active'
      AND rdp.can_create = TRUE
    ORDER BY p.display_name;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_get_maintenance_sponsors() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_maintenance_sponsors() TO authenticated;

COMMENT ON FUNCTION public.rpc_get_maintenance_sponsors() IS
'Returns staff eligible to sponsor an on-site maintenance work order. Requires maintenance:c. SECURITY DEFINER bypass of Tier-4 hr:r RLS on staff_records and the system:r gate on role_domain_permissions.';
