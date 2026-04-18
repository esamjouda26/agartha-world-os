-- =============================================================================
-- Harden audit_trigger_fn for composite-PK tables
-- =============================================================================
-- init_schema.sql:216-252 defines audit_trigger_fn() which references NEW.id /
-- OLD.id directly. plpgsql resolves field access at runtime against the row's
-- actual structure — on tables without an `id` column, this raises
--   "record \"new\" has no field \"id\""
-- immediately on INSERT/UPDATE/DELETE.
--
-- Three audited tables in init_schema use composite PKs and have no `id`:
--   public.material_procurement_data   PK (material_id, supplier_id)
--   public.material_sales_data         PK (material_id, pos_point_id)
--   public.leave_policy_entitlements   PK (policy_id, leave_type_id)
--
-- Fix: reach into the row via to_jsonb(...)->>'col' which returns NULL cleanly
-- when a column is absent, and build a composite entity_id for the 3 offenders
-- so audit forensics remain traceable. entity_id TEXT remains the same shape
-- callers already see (e.g. "<uuid>:<uuid>" for composite tables).
-- =============================================================================

SET search_path = public, extensions;

CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    _old        JSONB;
    _new        JSONB;
    _diff       JSONB;
    _row        JSONB;
    _entity_id  TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        _old := NULL;
        _new := to_jsonb(NEW);
        _row := _new;
    ELSIF TG_OP = 'DELETE' THEN
        _old := to_jsonb(OLD);
        _new := NULL;
        _row := _old;
    ELSIF TG_OP = 'UPDATE' THEN
        _old := NULL;
        SELECT jsonb_object_agg(key, value) INTO _diff
        FROM jsonb_each(to_jsonb(NEW))
        WHERE to_jsonb(NEW) -> key IS DISTINCT FROM to_jsonb(OLD) -> key;
        _new := _diff;
        _row := to_jsonb(NEW);
    END IF;

    -- Derive a printable entity_id regardless of PK shape.
    -- Tables with surrogate `id` UUIDs: take _row->>'id'.
    -- Composite-PK tables: concat the PK columns so audit rows remain traceable.
    _entity_id := CASE TG_TABLE_NAME
        WHEN 'material_procurement_data' THEN
            (_row->>'material_id') || ':' || (_row->>'supplier_id')
        WHEN 'material_sales_data' THEN
            (_row->>'material_id') || ':' || (_row->>'pos_point_id')
        WHEN 'leave_policy_entitlements' THEN
            (_row->>'policy_id') || ':' || (_row->>'leave_type_id')
        ELSE
            _row->>'id'
    END;

    INSERT INTO public.system_audit_log (action, entity_type, entity_id, old_values, new_values, performed_by)
    VALUES (
        lower(TG_OP),
        TG_TABLE_NAME,
        _entity_id,
        _old,
        _new,
        (SELECT auth.uid())
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;
