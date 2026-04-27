-- Fix: Allow runners (inventory_ops:u) to accept unassigned pending requisitions.
--
-- The original UPDATE USING clause required either:
--   - inventory_ops:d (admin override), OR
--   - assigned_to = auth.uid(), OR
--   - created_by = auth.uid()
--
-- This blocked the "accept" workflow where a runner claims a requisition they
-- didn't create and that has no assignee yet (assigned_to IS NULL).
--
-- The fix adds: OR (assigned_to IS NULL AND status = 'pending')
-- This mirrors the SELECT policy pattern (line 2897) where unassigned rows
-- are visible to all inventory_ops:r users.

DROP POLICY IF EXISTS "material_requisitions_update" ON material_requisitions;

CREATE POLICY "material_requisitions_update" ON material_requisitions FOR UPDATE TO authenticated
    USING (
        public.is_claims_fresh()
        AND (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'u'
        AND (
            (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'd'
            OR assigned_to = (SELECT auth.uid())
            OR created_by = (SELECT auth.uid())
            OR (assigned_to IS NULL AND status = 'pending')
        )
    )
    WITH CHECK (
        public.is_claims_fresh()
        AND (auth.jwt()->'app_metadata'->'domains'->'inventory_ops') ? 'u'
    );
