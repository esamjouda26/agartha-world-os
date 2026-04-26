-- =============================================================================
-- Migration: 4 atomic RPCs covering crew + management mutations that touch
-- multiple rows or multiple tables. Required by CLAUDE.md §4 "Transactional
-- Boundaries" — application-level multi-statement sequences are forbidden.
--
--   1. rpc_complete_delivery      — /crew/logistics/restock-queue (WF-10)
--   2. rpc_complete_stock_count   — /crew/logistics/stock-count   (WF-11)
--   3. rpc_receive_po_items       — /crew/logistics/po-receiving  (WF-9)
--   4. rpc_create_leave_request   — /crew/leave (also management)
--
-- All RPCs follow the project pattern:
--   * SECURITY DEFINER with `SET search_path = ''`
--   * Schema-qualified identifiers everywhere
--   * REVOKE EXECUTE FROM PUBLIC, anon
--   * GRANT EXECUTE TO authenticated
--   * Calling Server Action enforces RBAC + rate limit before invoking
-- =============================================================================

SET check_function_bodies = OFF;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. rpc_complete_delivery
-- ─────────────────────────────────────────────────────────────────────────────
-- Replaces deliver-requisition.ts's per-row UPDATE loop + status flip. Locks
-- the parent requisition row, validates ownership + current state, applies
-- delivered_qty per item, then transitions status → 'completed'. The
-- trg_gmi_a_cache_sync goods-movement triggers fire downstream as before.
--
-- p_items shape: jsonb array of `{"item_id": "...", "delivered_qty": 0}` rows.
CREATE OR REPLACE FUNCTION public.rpc_complete_delivery(
    p_requisition_id UUID,
    p_items          JSONB,
    p_actor_id       UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_req       RECORD;
    v_item      RECORD;
BEGIN
    SELECT id, status, assigned_to
      INTO v_req
      FROM public.material_requisitions
     WHERE id = p_requisition_id
     FOR UPDATE;
    IF v_req IS NULL THEN
        RAISE EXCEPTION 'requisition_not_found';
    END IF;
    IF v_req.assigned_to IS DISTINCT FROM p_actor_id THEN
        RAISE EXCEPTION 'forbidden_not_assignee';
    END IF;
    IF v_req.status <> 'in_progress' THEN
        RAISE EXCEPTION 'invalid_state';
    END IF;

    FOR v_item IN
        SELECT (elem->>'item_id')::UUID    AS item_id,
               (elem->>'delivered_qty')::NUMERIC AS delivered_qty
          FROM jsonb_array_elements(p_items) AS elem
    LOOP
        UPDATE public.material_requisition_items
           SET delivered_qty = v_item.delivered_qty,
               updated_at = NOW()
         WHERE id = v_item.item_id
           AND requisition_id = p_requisition_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'item_not_found';
        END IF;
    END LOOP;

    UPDATE public.material_requisitions
       SET status = 'completed',
           updated_by = p_actor_id,
           updated_at = NOW()
     WHERE id = p_requisition_id;

    RETURN p_requisition_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_complete_delivery(UUID, JSONB, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_complete_delivery(UUID, JSONB, UUID) TO authenticated;
COMMENT ON FUNCTION public.rpc_complete_delivery(UUID, JSONB, UUID)
    IS 'Atomic close of a runner-driven requisition delivery. CLAUDE.md §4 transactional boundary.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. rpc_complete_stock_count
-- ─────────────────────────────────────────────────────────────────────────────
-- Replaces update-stock-count.ts's loop + final status flip. Computes
-- discrepancy by comparing system_qty vs effective physical_qty across ALL
-- items in the reconciliation (submitted ones get the new value, others keep
-- the existing physical_qty). Final status: 'pending_review' if any mismatch,
-- else 'completed'.
--
-- Returns a row of (reconciliation_id, discrepancy_found, new_status).
DROP TYPE IF EXISTS public.stock_count_result CASCADE;
CREATE TYPE public.stock_count_result AS (
    reconciliation_id  UUID,
    discrepancy_found  BOOLEAN,
    new_status         TEXT
);

CREATE OR REPLACE FUNCTION public.rpc_complete_stock_count(
    p_reconciliation_id UUID,
    p_items             JSONB,
    p_actor_id          UUID
)
RETURNS public.stock_count_result
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_rec          RECORD;
    v_item         RECORD;
    v_discrepancy  BOOLEAN := FALSE;
    v_new_status   TEXT;
    v_result       public.stock_count_result;
BEGIN
    SELECT id, status, assigned_to
      INTO v_rec
      FROM public.inventory_reconciliations
     WHERE id = p_reconciliation_id
     FOR UPDATE;
    IF v_rec IS NULL THEN
        RAISE EXCEPTION 'reconciliation_not_found';
    END IF;
    IF v_rec.assigned_to IS DISTINCT FROM p_actor_id THEN
        RAISE EXCEPTION 'forbidden_not_assignee';
    END IF;
    IF v_rec.status NOT IN ('pending', 'in_progress') THEN
        RAISE EXCEPTION 'invalid_state';
    END IF;

    FOR v_item IN
        SELECT (elem->>'item_id')::UUID     AS item_id,
               (elem->>'physical_qty')::NUMERIC AS physical_qty
          FROM jsonb_array_elements(p_items) AS elem
    LOOP
        UPDATE public.inventory_reconciliation_items
           SET physical_qty = v_item.physical_qty,
               updated_at = NOW()
         WHERE id = v_item.item_id
           AND reconciliation_id = p_reconciliation_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'item_not_found';
        END IF;
    END LOOP;

    SELECT EXISTS (
        SELECT 1
          FROM public.inventory_reconciliation_items
         WHERE reconciliation_id = p_reconciliation_id
           AND physical_qty <> system_qty
    ) INTO v_discrepancy;

    v_new_status := CASE WHEN v_discrepancy THEN 'pending_review' ELSE 'completed' END;

    UPDATE public.inventory_reconciliations
       SET status = v_new_status::public.inventory_task_status,
           discrepancy_found = v_discrepancy,
           updated_by = p_actor_id,
           updated_at = NOW()
     WHERE id = p_reconciliation_id;

    v_result.reconciliation_id := p_reconciliation_id;
    v_result.discrepancy_found := v_discrepancy;
    v_result.new_status := v_new_status;
    RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_complete_stock_count(UUID, JSONB, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_complete_stock_count(UUID, JSONB, UUID) TO authenticated;
COMMENT ON FUNCTION public.rpc_complete_stock_count(UUID, JSONB, UUID)
    IS 'Atomic stock-count submission with discrepancy detection. CLAUDE.md §4 transactional boundary.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. rpc_receive_po_items
-- ─────────────────────────────────────────────────────────────────────────────
-- Replaces receive-po-items.ts's per-row UPDATE loop. Locks the parent PO
-- row, validates state, applies received_qty deltas (the existing
-- trg_po_receive_goods_movement trigger posts goods_movement entries based
-- on the delta).
CREATE OR REPLACE FUNCTION public.rpc_receive_po_items(
    p_po_id    UUID,
    p_items    JSONB,
    p_actor_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_po    RECORD;
    v_item  RECORD;
BEGIN
    SELECT id, status
      INTO v_po
      FROM public.purchase_orders
     WHERE id = p_po_id
     FOR UPDATE;
    IF v_po IS NULL THEN
        RAISE EXCEPTION 'po_not_found';
    END IF;
    IF v_po.status NOT IN ('sent', 'partially_received') THEN
        RAISE EXCEPTION 'invalid_state';
    END IF;

    FOR v_item IN
        SELECT (elem->>'item_id')::UUID    AS item_id,
               (elem->>'received_qty')::NUMERIC AS received_qty
          FROM jsonb_array_elements(p_items) AS elem
    LOOP
        UPDATE public.purchase_order_items
           SET received_qty = v_item.received_qty,
               updated_at = NOW()
         WHERE id = v_item.item_id
           AND po_id = p_po_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'item_not_found';
        END IF;
    END LOOP;

    UPDATE public.purchase_orders
       SET updated_by = p_actor_id,
           updated_at = NOW()
     WHERE id = p_po_id;

    RETURN p_po_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_receive_po_items(UUID, JSONB, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_receive_po_items(UUID, JSONB, UUID) TO authenticated;
COMMENT ON FUNCTION public.rpc_receive_po_items(UUID, JSONB, UUID)
    IS 'Atomic receive of PO line items. CLAUDE.md §4 transactional boundary.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. rpc_create_leave_request
-- ─────────────────────────────────────────────────────────────────────────────
-- Replaces create-leave-request.ts's "fetch profile → INSERT leave_request"
-- two-step. Resolves staff_record_id from auth.uid() inside the same
-- transaction, then inserts the leave_request row. Returns the new id.
CREATE OR REPLACE FUNCTION public.rpc_create_leave_request(
    p_leave_type_id   UUID,
    p_start_date      DATE,
    p_end_date        DATE,
    p_requested_days  NUMERIC,
    p_reason          TEXT,
    p_actor_id        UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_staff_record_id UUID;
    v_id              UUID;
BEGIN
    SELECT p.staff_record_id INTO v_staff_record_id
      FROM public.profiles p
     WHERE p.id = p_actor_id;
    IF v_staff_record_id IS NULL THEN
        RAISE EXCEPTION 'staff_record_not_linked';
    END IF;

    BEGIN
        INSERT INTO public.leave_requests (
            staff_record_id, leave_type_id, start_date, end_date,
            requested_days, reason, status, created_by
        )
        VALUES (
            v_staff_record_id, p_leave_type_id, p_start_date, p_end_date,
            p_requested_days, p_reason, 'pending', p_actor_id
        )
        RETURNING id INTO v_id;
    EXCEPTION
        WHEN exclusion_violation THEN
            RAISE EXCEPTION 'overlap_with_existing';
    END;

    RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_create_leave_request(UUID, DATE, DATE, NUMERIC, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_create_leave_request(UUID, DATE, DATE, NUMERIC, TEXT, UUID) TO authenticated;
COMMENT ON FUNCTION public.rpc_create_leave_request(UUID, DATE, DATE, NUMERIC, TEXT, UUID)
    IS 'Atomic leave-request creation. Resolves staff_record_id inside the same transaction.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. submit_pos_order  ←  idempotency-aware replacement
-- ─────────────────────────────────────────────────────────────────────────────
-- Per CLAUDE.md §2 "Critical mutation RPCs (booking, payment, POS order,
-- clock-in, webhook handlers) MUST accept p_idempotency_key UUID and store
-- it in a dedicated table with unique constraint; repeated calls return
-- prior result." The current submit_pos_order shipped without one; this
-- migration drops + recreates it with replay protection.
DROP FUNCTION IF EXISTS public.submit_pos_order(UUID, JSONB, TEXT);

CREATE OR REPLACE FUNCTION public.submit_pos_order(
    p_pos_point_id    UUID,
    p_items           JSONB,
    p_payment_method  TEXT,
    p_idempotency_key UUID
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_order_id UUID; v_total_amount NUMERIC := 0; v_item JSONB;
    v_material_id UUID; v_quantity NUMERIC; v_server_price NUMERIC; v_modifier_total NUMERIC;
BEGIN
    IF NOT ((auth.jwt()->'app_metadata'->'domains'->'pos') ? 'c') THEN RAISE EXCEPTION 'Forbidden: pos:c required'; END IF;

    -- Replay guard
    INSERT INTO public.idempotency_keys (key, scope, actor_id, response_hash)
    VALUES (p_idempotency_key, 'submit_pos_order', (SELECT auth.uid()), 'pending')
    ON CONFLICT (key, scope) DO NOTHING;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'duplicate_transaction';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.pos_points WHERE id = p_pos_point_id) THEN RAISE EXCEPTION 'POS_POINT_NOT_FOUND: %', p_pos_point_id; END IF;

    -- First pass: validate all items and compute total
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_material_id := (v_item ->> 'material_id')::UUID;
        v_quantity := (v_item ->> 'quantity')::NUMERIC;
        SELECT selling_price INTO v_server_price FROM public.material_sales_data
        WHERE material_id = v_material_id AND pos_point_id = p_pos_point_id AND is_active = TRUE;
        IF NOT FOUND THEN RAISE EXCEPTION 'MATERIAL_NOT_FOUND_OR_INACTIVE: %', v_material_id; END IF;

        v_modifier_total := 0;
        IF v_item ? 'modifiers' THEN
            SELECT COALESCE(SUM((mo.price_delta)::NUMERIC), 0) INTO v_modifier_total
            FROM jsonb_array_elements_text(v_item -> 'modifiers') AS mid
            JOIN public.pos_modifier_options mo ON mo.id = mid::UUID;
        END IF;
        v_total_amount := v_total_amount + ((v_server_price + v_modifier_total) * v_quantity);
    END LOOP;

    INSERT INTO public.orders (pos_point_id, status, total_amount, payment_method, created_by)
    VALUES (p_pos_point_id, 'preparing', v_total_amount, p_payment_method::public.payment_method, (SELECT auth.uid()))
    RETURNING id INTO v_order_id;

    -- Second pass: create line items + modifier snapshots
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_material_id := (v_item ->> 'material_id')::UUID;
        v_quantity := (v_item ->> 'quantity')::NUMERIC;
        SELECT selling_price INTO v_server_price FROM public.material_sales_data WHERE material_id = v_material_id AND pos_point_id = p_pos_point_id;

        v_modifier_total := 0;
        IF v_item ? 'modifiers' THEN
            SELECT COALESCE(SUM((mo.price_delta)::NUMERIC), 0) INTO v_modifier_total
            FROM jsonb_array_elements_text(v_item -> 'modifiers') AS mid
            JOIN public.pos_modifier_options mo ON mo.id = mid::UUID;
        END IF;

        DECLARE v_order_item_id UUID;
        BEGIN
            INSERT INTO public.order_items (order_id, material_id, quantity, unit_price)
            VALUES (v_order_id, v_material_id, v_quantity, v_server_price + v_modifier_total)
            RETURNING id INTO v_order_item_id;

            IF v_item ? 'modifiers' THEN
                INSERT INTO public.order_item_modifiers (order_item_id, modifier_option_id, option_name, price_delta, material_id, quantity_delta)
                SELECT v_order_item_id, mo.id, mo.name, mo.price_delta, mo.material_id, mo.quantity_delta
                FROM jsonb_array_elements_text(v_item -> 'modifiers') AS mid
                JOIN public.pos_modifier_options mo ON mo.id = mid::UUID;
            END IF;
        END;
    END LOOP;
    RETURN v_order_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_pos_order(UUID, JSONB, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_pos_order(UUID, JSONB, TEXT, UUID) TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. rpc_checkin_booking  ←  idempotency-aware replacement
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.rpc_checkin_booking(UUID);

CREATE OR REPLACE FUNCTION public.rpc_checkin_booking(
    p_booking_id      UUID,
    p_idempotency_key UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_booking RECORD; v_tier_name TEXT;
BEGIN
    IF NOT ((auth.jwt()->'app_metadata'->'domains'->'booking') ? 'u') THEN RAISE EXCEPTION 'Forbidden: booking:u required'; END IF;

    INSERT INTO public.idempotency_keys (key, scope, actor_id, response_hash)
    VALUES (p_idempotency_key, 'rpc_checkin_booking', (SELECT auth.uid()), 'pending')
    ON CONFLICT (key, scope) DO NOTHING;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'duplicate_transaction';
    END IF;

    SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
    IF v_booking IS NULL THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;
    IF v_booking.status = 'cancelled' THEN RAISE EXCEPTION 'BOOKING_CANCELLED'; END IF;
    IF v_booking.status = 'pending_payment' THEN RAISE EXCEPTION 'PAYMENT_NOT_COMPLETED'; END IF;
    IF v_booking.status = 'checked_in' THEN RAISE EXCEPTION 'ALREADY_CHECKED_IN'; END IF;
    IF v_booking.status = 'completed' THEN RAISE EXCEPTION 'BOOKING_ALREADY_COMPLETED'; END IF;
    UPDATE public.bookings SET status = 'checked_in', checked_in_at = NOW(), updated_at = NOW() WHERE id = p_booking_id;
    SELECT t.name INTO v_tier_name FROM public.tiers t WHERE t.id = v_booking.tier_id;
    RETURN jsonb_build_object('booking_id', v_booking.id, 'booking_ref', v_booking.booking_ref, 'booker_name', v_booking.booker_name, 'tier_name', v_tier_name, 'adult_count', v_booking.adult_count, 'child_count', v_booking.child_count, 'checked_in_at', NOW());
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_checkin_booking(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_checkin_booking(UUID, UUID) TO authenticated;
