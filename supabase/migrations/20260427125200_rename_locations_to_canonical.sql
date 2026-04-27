-- =============================================================================
-- Migration: Rename locations to operator-preferred canonical names
-- =============================================================================

UPDATE public.locations SET name = 'Cafe'          WHERE name = 'F&B Kitchen';
UPDATE public.locations SET name = 'Agartha World' WHERE name = 'Experience Zone 1';
UPDATE public.locations SET name = 'Entrance'      WHERE name = 'Main Building';
-- 'Central Warehouse' and 'Gift Shop' already correct — no change needed.
