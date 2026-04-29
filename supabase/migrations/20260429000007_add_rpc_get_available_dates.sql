-- Returns distinct dates that have generated time slots for an experience,
-- starting from today. Used by the guest booking calendar to show only
-- dates that the scheduler/cron has created slots for, instead of a
-- hardcoded 14-day window.
CREATE OR REPLACE FUNCTION public.rpc_get_available_dates(
  p_experience_id UUID
)
RETURNS TABLE(slot_date DATE)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT DISTINCT ts.slot_date
  FROM public.time_slots ts
  WHERE ts.experience_id = p_experience_id
    AND ts.slot_date >= CURRENT_DATE
  ORDER BY ts.slot_date;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_get_available_dates FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_available_dates TO anon, authenticated;
