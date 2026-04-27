-- =============================================================================
-- Migration: Repoint write_offs auth.users FKs to public.profiles
-- =============================================================================
-- This migration repoints the disposed_by, reviewed_by, created_by, and 
-- updated_by foreign keys on the write_offs table to reference public.profiles(id) 
-- instead of auth.users(id). 
-- This fixes the PostgREST join failure where the RSC attempts to join 
-- the profiles table via these foreign keys, which is natively supported 
-- only when the keys point to the public schema.
-- =============================================================================

ALTER TABLE public.write_offs
  DROP CONSTRAINT IF EXISTS write_offs_disposed_by_fkey,
  DROP CONSTRAINT IF EXISTS write_offs_reviewed_by_fkey,
  DROP CONSTRAINT IF EXISTS write_offs_created_by_fkey,
  DROP CONSTRAINT IF EXISTS write_offs_updated_by_fkey,
  
  ADD CONSTRAINT write_offs_disposed_by_fkey FOREIGN KEY (disposed_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT write_offs_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT write_offs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT write_offs_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
