-- =============================================================================
-- Migration: Reconcile duplicate location data
-- =============================================================================
-- The init_schema (line 1201) seeded 5 stub locations:
--   'Warehouse', 'Cafe', 'Giftshop', 'Agartha World', 'Entrance'
--
-- The seed.sql later inserted 5 canonical locations with stable UUIDs,
-- org_unit_ids, and proper names:
--   'Central Warehouse', 'F&B Kitchen', 'Gift Shop', 'Experience Zone 1',
--   'Main Building'
--
-- Because the names differ, both sets exist. The init_schema locations have
-- ZERO location_allowed_categories entries, causing
-- trg_validate_gmi_location to block ALL goods movements referencing them.
--
-- Fix: Remap all FK references from init_schema locations to their seed.sql
-- equivalents, then delete the stubs.
--
-- REPLAY-SAFETY (revised 2026-04-29): the original version assumed the
-- canonical 5 locations had been INSERTed by seed.sql before the migration
-- ran. That assumption holds in production (where seed ran first) but breaks
-- on shadow DB / preview branch / CI replay (which apply migrations against
-- an empty DB before seed.sql). The previous DO-block-guard fix made the
-- migration skip safely on fresh provision — but that meant init_schema's
-- stub locations were never cleaned up, leaving fresh DBs with 7+ locations
-- vs cloud's 5.
--
-- This revision makes the migration SELF-CONTAINED: it INSERTs the canonical
-- 5 locations (with cloud's actual UUIDs and the canonical names that the
-- next migration `rename_locations_to_canonical` then renames to operator-
-- preferred names) at the top, so the UPDATE/DELETE body below works whether
-- seed.sql has run or not.
--
--   - On cloud (already-applied): all canonical UUIDs already exist →
--     INSERT ... ON CONFLICT (id) DO NOTHING is a no-op. The DELETE is
--     scoped to NON-canonical UUIDs so cloud's canonical rows are safe even
--     under hypothetical re-run.
--   - On fresh DB: canonical 5 inserted; init_schema's stub FK references
--     get remapped to canonical UUIDs; init_schema's stub locations deleted.
--     End state matches cloud's location UUIDs and (after the rename
--     migration) names.
--
-- org_unit_id is left NULL by this migration. seed.sql sets it for cloud-
-- parity; on fresh provision without seed, locations have NULL org links
-- (FK is ON DELETE SET NULL anyway).
-- =============================================================================

-- ─── 0. Bootstrap canonical locations (cloud UUIDs, canonical names) ─────────

INSERT INTO public.locations (id, name, is_active) VALUES
    ('aa000000-0000-0000-0000-000000000002', 'Central Warehouse',  true),
    ('aa000000-0000-0000-0000-000000000004', 'Gift Shop',           true),
    ('aa000000-0000-0000-0000-000000000003', 'F&B Kitchen',         true),
    ('aa000000-0000-0000-0000-000000000005', 'Experience Zone 1',   true),
    ('aa000000-0000-0000-0000-000000000001', 'Main Building',       true)
ON CONFLICT (id) DO NOTHING;

-- ─── 1. material_requisitions ─────────────────────────────────────────────────

UPDATE public.material_requisitions
   SET from_location_id = (SELECT id FROM public.locations WHERE name = 'Central Warehouse')
 WHERE from_location_id = (SELECT id FROM public.locations WHERE name = 'Warehouse');

UPDATE public.material_requisitions
   SET to_location_id = (SELECT id FROM public.locations WHERE name = 'F&B Kitchen')
 WHERE to_location_id = (SELECT id FROM public.locations WHERE name = 'Cafe');

UPDATE public.material_requisitions
   SET to_location_id = (SELECT id FROM public.locations WHERE name = 'Gift Shop')
 WHERE to_location_id = (SELECT id FROM public.locations WHERE name = 'Giftshop');

UPDATE public.material_requisitions
   SET to_location_id = (SELECT id FROM public.locations WHERE name = 'Experience Zone 1')
 WHERE to_location_id = (SELECT id FROM public.locations WHERE name = 'Agartha World');

UPDATE public.material_requisitions
   SET to_location_id = (SELECT id FROM public.locations WHERE name = 'Main Building')
 WHERE to_location_id = (SELECT id FROM public.locations WHERE name = 'Entrance');

-- ─── 2. inventory_reconciliations ─────────────────────────────────────────────

UPDATE public.inventory_reconciliations
   SET location_id = (SELECT id FROM public.locations WHERE name = 'Central Warehouse')
 WHERE location_id = (SELECT id FROM public.locations WHERE name = 'Warehouse');

UPDATE public.inventory_reconciliations
   SET location_id = (SELECT id FROM public.locations WHERE name = 'F&B Kitchen')
 WHERE location_id = (SELECT id FROM public.locations WHERE name = 'Cafe');

UPDATE public.inventory_reconciliations
   SET location_id = (SELECT id FROM public.locations WHERE name = 'Gift Shop')
 WHERE location_id = (SELECT id FROM public.locations WHERE name = 'Giftshop');

UPDATE public.inventory_reconciliations
   SET location_id = (SELECT id FROM public.locations WHERE name = 'Experience Zone 1')
 WHERE location_id = (SELECT id FROM public.locations WHERE name = 'Agartha World');

UPDATE public.inventory_reconciliations
   SET location_id = (SELECT id FROM public.locations WHERE name = 'Main Building')
 WHERE location_id = (SELECT id FROM public.locations WHERE name = 'Entrance');

-- ─── 3. goods_movement_items ──────────────────────────────────────────────────

UPDATE public.goods_movement_items
   SET location_id = (SELECT id FROM public.locations WHERE name = 'Central Warehouse')
 WHERE location_id = (SELECT id FROM public.locations WHERE name = 'Warehouse');

UPDATE public.goods_movement_items
   SET location_id = (SELECT id FROM public.locations WHERE name = 'F&B Kitchen')
 WHERE location_id = (SELECT id FROM public.locations WHERE name = 'Cafe');

UPDATE public.goods_movement_items
   SET location_id = (SELECT id FROM public.locations WHERE name = 'Gift Shop')
 WHERE location_id = (SELECT id FROM public.locations WHERE name = 'Giftshop');

UPDATE public.goods_movement_items
   SET location_id = (SELECT id FROM public.locations WHERE name = 'Experience Zone 1')
 WHERE location_id = (SELECT id FROM public.locations WHERE name = 'Agartha World');

UPDATE public.goods_movement_items
   SET location_id = (SELECT id FROM public.locations WHERE name = 'Main Building')
 WHERE location_id = (SELECT id FROM public.locations WHERE name = 'Entrance');

-- ─── 4. stock_balance_cache ───────────────────────────────────────────────────

UPDATE public.stock_balance_cache
   SET location_id = (SELECT id FROM public.locations WHERE name = 'Central Warehouse')
 WHERE location_id = (SELECT id FROM public.locations WHERE name = 'Warehouse');

UPDATE public.stock_balance_cache
   SET location_id = (SELECT id FROM public.locations WHERE name = 'F&B Kitchen')
 WHERE location_id = (SELECT id FROM public.locations WHERE name = 'Cafe');

UPDATE public.stock_balance_cache
   SET location_id = (SELECT id FROM public.locations WHERE name = 'Gift Shop')
 WHERE location_id = (SELECT id FROM public.locations WHERE name = 'Giftshop');

UPDATE public.stock_balance_cache
   SET location_id = (SELECT id FROM public.locations WHERE name = 'Experience Zone 1')
 WHERE location_id = (SELECT id FROM public.locations WHERE name = 'Agartha World');

UPDATE public.stock_balance_cache
   SET location_id = (SELECT id FROM public.locations WHERE name = 'Main Building')
 WHERE location_id = (SELECT id FROM public.locations WHERE name = 'Entrance');

-- ─── 5. material_valuation ────────────────────────────────────────────────────

UPDATE public.material_valuation
   SET location_id = (SELECT id FROM public.locations WHERE name = 'Central Warehouse')
 WHERE location_id = (SELECT id FROM public.locations WHERE name = 'Warehouse');

UPDATE public.material_valuation
   SET location_id = (SELECT id FROM public.locations WHERE name = 'F&B Kitchen')
 WHERE location_id = (SELECT id FROM public.locations WHERE name = 'Cafe');

UPDATE public.material_valuation
   SET location_id = (SELECT id FROM public.locations WHERE name = 'Gift Shop')
 WHERE location_id = (SELECT id FROM public.locations WHERE name = 'Giftshop');

UPDATE public.material_valuation
   SET location_id = (SELECT id FROM public.locations WHERE name = 'Experience Zone 1')
 WHERE location_id = (SELECT id FROM public.locations WHERE name = 'Agartha World');

UPDATE public.material_valuation
   SET location_id = (SELECT id FROM public.locations WHERE name = 'Main Building')
 WHERE location_id = (SELECT id FROM public.locations WHERE name = 'Entrance');

-- ─── 6. purchase_orders ───────────────────────────────────────────────────────

UPDATE public.purchase_orders
   SET receiving_location_id = (SELECT id FROM public.locations WHERE name = 'Central Warehouse')
 WHERE receiving_location_id = (SELECT id FROM public.locations WHERE name = 'Warehouse');

UPDATE public.purchase_orders
   SET receiving_location_id = (SELECT id FROM public.locations WHERE name = 'F&B Kitchen')
 WHERE receiving_location_id = (SELECT id FROM public.locations WHERE name = 'Cafe');

UPDATE public.purchase_orders
   SET receiving_location_id = (SELECT id FROM public.locations WHERE name = 'Gift Shop')
 WHERE receiving_location_id = (SELECT id FROM public.locations WHERE name = 'Giftshop');

UPDATE public.purchase_orders
   SET receiving_location_id = (SELECT id FROM public.locations WHERE name = 'Experience Zone 1')
 WHERE receiving_location_id = (SELECT id FROM public.locations WHERE name = 'Agartha World');

UPDATE public.purchase_orders
   SET receiving_location_id = (SELECT id FROM public.locations WHERE name = 'Main Building')
 WHERE receiving_location_id = (SELECT id FROM public.locations WHERE name = 'Entrance');

-- ─── 7. pos_points ────────────────────────────────────────────────────────────
-- Init_schema created: cafe → 'Cafe', giftshop → 'Giftshop',
-- vending_machine → 'Agartha World'. Remap to seed.sql locations.

UPDATE public.pos_points
   SET location_id = (SELECT id FROM public.locations WHERE name = 'F&B Kitchen')
 WHERE name = 'cafe';

UPDATE public.pos_points
   SET location_id = (SELECT id FROM public.locations WHERE name = 'Gift Shop')
 WHERE name = 'giftshop';

UPDATE public.pos_points
   SET location_id = (SELECT id FROM public.locations WHERE name = 'Experience Zone 1')
 WHERE name = 'vending_machine';

-- ─── 8. zones ─────────────────────────────────────────────────────────────────
-- location_id FK is ON DELETE CASCADE, but remap explicitly for safety.

UPDATE public.zones
   SET location_id = (SELECT id FROM public.locations WHERE name = 'Central Warehouse')
 WHERE location_id = (SELECT id FROM public.locations WHERE name = 'Warehouse');

UPDATE public.zones
   SET location_id = (SELECT id FROM public.locations WHERE name = 'F&B Kitchen')
 WHERE location_id = (SELECT id FROM public.locations WHERE name = 'Cafe');

UPDATE public.zones
   SET location_id = (SELECT id FROM public.locations WHERE name = 'Gift Shop')
 WHERE location_id = (SELECT id FROM public.locations WHERE name = 'Giftshop');

UPDATE public.zones
   SET location_id = (SELECT id FROM public.locations WHERE name = 'Experience Zone 1')
 WHERE location_id = (SELECT id FROM public.locations WHERE name = 'Agartha World');

UPDATE public.zones
   SET location_id = (SELECT id FROM public.locations WHERE name = 'Main Building')
 WHERE location_id = (SELECT id FROM public.locations WHERE name = 'Entrance');

-- ─── 9. Delete the init_schema stub locations ─────────────────────────────────
-- All FK references have been remapped above. location_allowed_categories
-- uses ON DELETE CASCADE, so any stray entries (there are none) auto-delete.

-- DELETE init_schema's stub locations.
-- Scoped by `id NOT IN (canonical 5)` so this is safe to re-run on cloud
-- even after the rename migration converted canonical names back to
-- 'Cafe', 'Agartha World', 'Entrance' — those rows have canonical UUIDs
-- and are excluded from the WHERE clause.
DELETE FROM public.locations
 WHERE name IN ('Warehouse', 'Cafe', 'Giftshop', 'Agartha World', 'Entrance')
   AND id NOT IN (
       'aa000000-0000-0000-0000-000000000001',
       'aa000000-0000-0000-0000-000000000002',
       'aa000000-0000-0000-0000-000000000003',
       'aa000000-0000-0000-0000-000000000004',
       'aa000000-0000-0000-0000-000000000005'
   );
