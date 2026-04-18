-- =============================================================================
-- Harden v_stock_on_hand (Supabase advisor: "Secure your View")
-- =============================================================================
-- init_schema.sql:2593 created public.v_stock_on_hand without an explicit
-- security_invoker clause. In Postgres 15+, that defaults the view to run with
-- the creator's (postgres) privileges, which:
--   (a) bypasses RLS on goods_movement_items for any caller, and
--   (b) exposes the view via PostgREST to anon/authenticated roles.
--
-- Per the view's own comment at init_schema.sql:2590-2592, the only legitimate
-- consumer is a nightly drift-detection job (service_role). We therefore:
--   1. Flip the view to security_invoker so any future caller is subject to the
--      RLS policies on goods_movement_items (Tier 3 inventory_ops).
--   2. Revoke SELECT from anon/authenticated so the view is not reachable via
--      the public API at all. service_role retains access by default and is
--      unaffected by REVOKE ... FROM authenticated/anon.
-- =============================================================================

SET search_path = public, extensions;

ALTER VIEW public.v_stock_on_hand SET (security_invoker = true);

REVOKE ALL ON public.v_stock_on_hand FROM anon, authenticated;

COMMENT ON VIEW public.v_stock_on_hand IS
    'Nightly drift-detection source. security_invoker=true; not exposed to anon/authenticated. Compare against stock_balance_cache in a service-role job only.';
