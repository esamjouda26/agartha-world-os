-- =============================================================================
-- Migration: Marketing — rpc_upsert_promo_code
-- =============================================================================
-- Atomic upsert of a promo code plus its valid-tier junction. Required by
-- /management/marketing/promos because the spec splits the work into two
-- mutations (promo_codes + promo_valid_tiers) which together must be one
-- transaction per CLAUDE.md §4 "Transactional Boundaries". Application
-- multi-statement sequences are forbidden, so we expose this RPC.
--
-- Authorization: SECURITY DEFINER, but the calling Server Action runs the
-- RBAC gate (`marketing:c` for INSERT, `marketing:u` for UPDATE) before
-- invocation — same pattern as `rpc_create_requisition`.
-- =============================================================================

SET check_function_bodies = OFF;

CREATE OR REPLACE FUNCTION public.rpc_upsert_promo_code(
    p_id                UUID,
    p_code              TEXT,
    p_description       TEXT,
    p_discount_type     public.discount_type,
    p_discount_value    NUMERIC,
    p_max_uses          INTEGER,
    p_campaign_id       UUID,
    p_status            public.lifecycle_status,
    p_valid_from        TIMESTAMPTZ,
    p_valid_to          TIMESTAMPTZ,
    p_valid_days_mask   INTEGER,
    p_valid_time_start  TIME,
    p_valid_time_end    TIME,
    p_min_group_size    INTEGER,
    p_tier_ids          UUID[],
    p_actor_id          UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_id        UUID;
    v_tier_id   UUID;
BEGIN
    IF p_id IS NULL THEN
        BEGIN
            INSERT INTO public.promo_codes (
                code, description, discount_type, discount_value, max_uses,
                campaign_id, status, valid_from, valid_to, valid_days_mask,
                valid_time_start, valid_time_end, min_group_size,
                created_by, updated_by
            )
            VALUES (
                UPPER(p_code), p_description, p_discount_type, p_discount_value, p_max_uses,
                p_campaign_id, p_status, p_valid_from, p_valid_to, p_valid_days_mask,
                p_valid_time_start, p_valid_time_end, COALESCE(p_min_group_size, 1),
                p_actor_id, p_actor_id
            )
            RETURNING id INTO v_id;
        EXCEPTION
            WHEN unique_violation THEN
                RAISE EXCEPTION 'duplicate_code';
        END;
    ELSE
        BEGIN
            UPDATE public.promo_codes
               SET code = UPPER(p_code),
                   description = p_description,
                   discount_type = p_discount_type,
                   discount_value = p_discount_value,
                   max_uses = p_max_uses,
                   campaign_id = p_campaign_id,
                   status = p_status,
                   valid_from = p_valid_from,
                   valid_to = p_valid_to,
                   valid_days_mask = p_valid_days_mask,
                   valid_time_start = p_valid_time_start,
                   valid_time_end = p_valid_time_end,
                   min_group_size = COALESCE(p_min_group_size, 1),
                   updated_by = p_actor_id,
                   updated_at = NOW()
             WHERE id = p_id
            RETURNING id INTO v_id;
        EXCEPTION
            WHEN unique_violation THEN
                RAISE EXCEPTION 'duplicate_code';
        END;

        IF v_id IS NULL THEN
            RAISE EXCEPTION 'not_found';
        END IF;
    END IF;

    -- Sync the valid-tier junction. DELETE-then-INSERT is safe inside a
    -- single transaction; without this RPC the application-level sequence
    -- would violate §4.
    DELETE FROM public.promo_valid_tiers WHERE promo_code_id = v_id;

    IF p_tier_ids IS NOT NULL AND array_length(p_tier_ids, 1) > 0 THEN
        FOREACH v_tier_id IN ARRAY p_tier_ids LOOP
            INSERT INTO public.promo_valid_tiers (promo_code_id, tier_id)
            VALUES (v_id, v_tier_id);
        END LOOP;
    END IF;

    RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_upsert_promo_code(
    UUID, TEXT, TEXT, public.discount_type, NUMERIC, INTEGER, UUID,
    public.lifecycle_status, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, TIME, TIME,
    INTEGER, UUID[], UUID
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.rpc_upsert_promo_code(
    UUID, TEXT, TEXT, public.discount_type, NUMERIC, INTEGER, UUID,
    public.lifecycle_status, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, TIME, TIME,
    INTEGER, UUID[], UUID
) TO authenticated;

COMMENT ON FUNCTION public.rpc_upsert_promo_code(
    UUID, TEXT, TEXT, public.discount_type, NUMERIC, INTEGER, UUID,
    public.lifecycle_status, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, TIME, TIME,
    INTEGER, UUID[], UUID
) IS 'Atomic upsert of a promo code and its valid-tier junction. Required by Pattern C / §4 transactional boundaries.';
