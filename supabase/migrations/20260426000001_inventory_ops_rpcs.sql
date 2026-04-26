-- =============================================================================
-- Migration: Inventory Ops RPCs
-- =============================================================================
-- Fixes Pattern C multi-statement transaction violations by exposing
-- atomic mutation endpoints for creating requisitions and scheduling reconciliations.
-- Implements idempotency guards using public.idempotency_keys.
-- =============================================================================

SET check_function_bodies = OFF;

-- =============================================================================
-- 1. rpc_create_requisition
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_create_requisition(
    p_from_location_id UUID,
    p_to_location_id UUID,
    p_requester_remark TEXT,
    p_created_by UUID,
    p_items JSONB,
    p_idempotency_key UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_req_id UUID;
    v_item JSONB;
BEGIN
    -- 1. Idempotency Guard
    INSERT INTO public.idempotency_keys (key, scope, actor_id, response_hash)
    VALUES (p_idempotency_key, 'rpc_create_requisition', p_created_by, 'pending')
    ON CONFLICT (key, scope) DO NOTHING;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'duplicate_transaction';
    END IF;

    -- 2. Insert Header
    INSERT INTO public.material_requisitions (
        from_location_id, to_location_id, requester_remark, status, created_by
    )
    VALUES (
        p_from_location_id, p_to_location_id, p_requester_remark, 'pending', p_created_by
    )
    RETURNING id INTO v_req_id;

    -- 3. Insert Line Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.material_requisition_items (
            requisition_id, material_id, requested_qty, movement_type_code
        )
        VALUES (
            v_req_id,
            (v_item->>'material_id')::UUID,
            (v_item->>'requested_qty')::NUMERIC,
            (v_item->>'movement_type_code')::TEXT
        );
    END LOOP;

    -- 4. Update Idempotency Response (Optional, but good practice)
    UPDATE public.idempotency_keys
       SET response_hash = v_req_id::TEXT
     WHERE key = p_idempotency_key AND scope = 'rpc_create_requisition';

    RETURN v_req_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_create_requisition(UUID, UUID, TEXT, UUID, JSONB, UUID) FROM PUBLIC, anon, authenticated;
-- Expose to authenticated users. RLS will NOT apply to the inserts inside SECURITY DEFINER,
-- so the Server Action must enforce authorization. The Server Action `createRequisition`
-- runs the standard RLS-matching RBAC check (`appMeta.domains?.inventory_ops?.includes("c")`)
-- before invoking this RPC.
GRANT EXECUTE ON FUNCTION public.rpc_create_requisition(UUID, UUID, TEXT, UUID, JSONB, UUID) TO authenticated;

COMMENT ON FUNCTION public.rpc_create_requisition(UUID, UUID, TEXT, UUID, JSONB, UUID) IS 'Atomic creation of a material requisition and its line items. Required by Pattern C.';


-- =============================================================================
-- 2. rpc_schedule_reconciliation
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_schedule_reconciliation(
    p_location_id UUID,
    p_scheduled_date DATE,
    p_scheduled_time TIME,
    p_assigned_to UUID,
    p_manager_remark TEXT,
    p_created_by UUID,
    p_items JSONB,
    p_idempotency_key UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_recon_id UUID;
    v_item JSONB;
BEGIN
    -- 1. Idempotency Guard
    INSERT INTO public.idempotency_keys (key, scope, actor_id, response_hash)
    VALUES (p_idempotency_key, 'rpc_schedule_reconciliation', p_created_by, 'pending')
    ON CONFLICT (key, scope) DO NOTHING;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'duplicate_transaction';
    END IF;

    -- 2. Insert Header
    BEGIN
        INSERT INTO public.inventory_reconciliations (
            location_id, scheduled_date, scheduled_time, assigned_to, manager_remark, status, created_by
        )
        VALUES (
            p_location_id, p_scheduled_date, p_scheduled_time, p_assigned_to, p_manager_remark, 'pending', p_created_by
        )
        RETURNING id INTO v_recon_id;
    EXCEPTION WHEN foreign_key_violation THEN
        RAISE EXCEPTION 'fk_violation';
    END;

    -- 3. Insert Line Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.inventory_reconciliation_items (
            reconciliation_id, material_id, system_qty, physical_qty
        )
        VALUES (
            v_recon_id,
            (v_item->>'material_id')::UUID,
            COALESCE((v_item->>'system_qty')::NUMERIC, 0),
            0 -- physical_qty defaults to 0 initially
        );
    END LOOP;

    -- 4. Update Idempotency Response
    UPDATE public.idempotency_keys
       SET response_hash = v_recon_id::TEXT
     WHERE key = p_idempotency_key AND scope = 'rpc_schedule_reconciliation';

    RETURN v_recon_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_schedule_reconciliation(UUID, DATE, TIME, UUID, TEXT, UUID, JSONB, UUID) FROM PUBLIC, anon, authenticated;
-- Expose to authenticated users. AuthZ handled by Server Action.
GRANT EXECUTE ON FUNCTION public.rpc_schedule_reconciliation(UUID, DATE, TIME, UUID, TEXT, UUID, JSONB, UUID) TO authenticated;

COMMENT ON FUNCTION public.rpc_schedule_reconciliation(UUID, DATE, TIME, UUID, TEXT, UUID, JSONB, UUID) IS 'Atomic creation of an inventory reconciliation and snapshot items. Required by Pattern C.';
