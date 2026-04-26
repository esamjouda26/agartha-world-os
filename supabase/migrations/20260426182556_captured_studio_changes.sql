drop policy "attendance_exceptions_insert" on "public"."attendance_exceptions";

drop policy "attendance_exceptions_select" on "public"."attendance_exceptions";

drop policy "crew_zones_select" on "public"."crew_zones";

drop policy "leave_ledger_select" on "public"."leave_ledger";

drop policy "leave_requests_insert" on "public"."leave_requests";

drop policy "leave_requests_select" on "public"."leave_requests";

drop policy "shift_schedules_insert" on "public"."shift_schedules";

drop policy "staff_records_insert" on "public"."staff_records";

drop policy "staff_records_select" on "public"."staff_records";

drop policy "staff_roster_assignments_insert" on "public"."staff_roster_assignments";

drop policy "staff_roster_assignments_select" on "public"."staff_roster_assignments";

drop policy "timecard_punches_insert" on "public"."timecard_punches";

drop policy "timecard_punches_select" on "public"."timecard_punches";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.fn_leave_policy_accrual()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_fiscal_year    int  := EXTRACT(YEAR FROM CURRENT_DATE)::int;
  v_current_month  int  := EXTRACT(MONTH FROM CURRENT_DATE)::int;
  v_actor_id       uuid := NEW.updated_by;
  v_target_days    numeric;
  v_existing_sum   numeric;
  v_delta          numeric;
  v_type_ids       uuid[];
  v_type_id        uuid;
BEGIN
  -- No-op if the value didn't actually change
  IF OLD.leave_policy_id IS NOT DISTINCT FROM NEW.leave_policy_id THEN
    RETURN NEW;
  END IF;

  -- Collect all leave type IDs involved (union of old auto-entries + new entitlements)
  SELECT array_agg(DISTINCT type_id) INTO v_type_ids
  FROM (
    SELECT leave_type_id as type_id
    FROM leave_ledger
    WHERE staff_record_id = NEW.id
      AND fiscal_year     = v_fiscal_year
      AND notes LIKE 'Auto-%'
    UNION
    SELECT leave_type_id as type_id
    FROM leave_policy_entitlements
    WHERE policy_id = NEW.leave_policy_id  -- NULL-safe: returns 0 rows if NULL
  ) combined;

  -- Nothing to do if no types are involved
  IF v_type_ids IS NULL THEN
    RETURN NEW;
  END IF;

  FOREACH v_type_id IN ARRAY v_type_ids
  LOOP
    -- Sum of all auto-managed entries for this type in the current fiscal year
    SELECT COALESCE(SUM(days), 0) INTO v_existing_sum
    FROM leave_ledger
    WHERE staff_record_id  = NEW.id
      AND leave_type_id    = v_type_id
      AND fiscal_year      = v_fiscal_year
      AND notes LIKE 'Auto-%';

    -- Target balance from the new policy (0 if policy is NULL or type not in policy)
    IF NEW.leave_policy_id IS NOT NULL THEN
      SELECT CASE lpe.frequency
          WHEN 'annual_upfront'   THEN lpe.days_per_year
          WHEN 'monthly_prorated' THEN
            ROUND(lpe.days_per_year * (13 - v_current_month)::numeric / 12, 2)
        END
      INTO v_target_days
      FROM leave_policy_entitlements lpe
      WHERE lpe.policy_id     = NEW.leave_policy_id
        AND lpe.leave_type_id = v_type_id;
    ELSE
      v_target_days := NULL;
    END IF;

    -- Default to 0 if type not in new policy
    v_target_days := COALESCE(v_target_days, 0);

    -- Compute delta
    v_delta := v_target_days - v_existing_sum;

    -- Insert adjustment if needed
    IF v_delta <> 0 THEN
      INSERT INTO leave_ledger (
        staff_record_id, leave_type_id, fiscal_year, transaction_date,
        transaction_type, days, org_unit_path, notes, created_by
      ) VALUES (
        NEW.id, v_type_id, v_fiscal_year, CURRENT_DATE,
        'adjustment'::leave_transaction_type, v_delta,
        NEW.org_unit_path,
        CASE
          WHEN OLD.leave_policy_id IS NULL THEN
            format('Auto-accrual: policy assigned (target %s days)', v_target_days)
          WHEN NEW.leave_policy_id IS NULL THEN
            format('Auto-reversal: policy removed (zeroed %s days)', v_existing_sum)
          ELSE
            format('Auto-adjustment: policy changed (%s → %s days)', v_existing_sum, v_target_days)
        END,
        v_actor_id
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_confirm_password_set()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_uid UUID := (SELECT auth.uid());
    v_current_status TEXT;
    v_contract_start DATE;
BEGIN
    -- Short-circuit if already set
    IF (SELECT password_set FROM public.profiles WHERE id = v_uid) = TRUE THEN
        RETURN;
    END IF;

    -- Set password_set = TRUE
    UPDATE public.profiles
    SET password_set = TRUE, updated_at = now()
    WHERE id = v_uid;

    -- Check if we should auto-activate: pending + contract_start <= today
    SELECT p.employment_status, sr.contract_start
    INTO v_current_status, v_contract_start
    FROM public.profiles p
    LEFT JOIN public.staff_records sr ON sr.id = p.staff_record_id
    WHERE p.id = v_uid;

    IF v_current_status = 'pending' AND v_contract_start IS NOT NULL AND v_contract_start <= CURRENT_DATE THEN
        UPDATE public.profiles
        SET employment_status = 'active', updated_at = now()
        WHERE id = v_uid;
    END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_void_own_punch(p_punch_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_staff_record_id UUID;
    v_punch RECORD;
    -- Grace window for self-service undo. Enterprise norm (DingTalk,
    -- Deputy, When I Work) is 2-5 minutes, but configured to 1 hour here.
    -- HR/Admin can void outside this window via the existing update policy.
    v_void_window INTERVAL := INTERVAL '1 hour';
BEGIN
    IF NOT public.is_claims_fresh() THEN
        RAISE EXCEPTION 'STALE_JWT';
    END IF;

    SELECT p.staff_record_id INTO v_staff_record_id
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid());
    IF v_staff_record_id IS NULL THEN
        RAISE EXCEPTION 'STAFF_RECORD_NOT_LINKED';
    END IF;

    SELECT * INTO v_punch
    FROM public.timecard_punches tp
    WHERE tp.id = p_punch_id
      AND tp.staff_record_id = v_staff_record_id
    FOR UPDATE;

    IF v_punch IS NULL THEN
        RAISE EXCEPTION 'PUNCH_NOT_FOUND_OR_NOT_YOURS: %', p_punch_id;
    END IF;
    IF v_punch.voided_at IS NOT NULL THEN
        RAISE EXCEPTION 'ALREADY_VOIDED';
    END IF;
    IF NOW() - v_punch.created_at > v_void_window THEN
        RAISE EXCEPTION 'VOID_WINDOW_EXPIRED';
    END IF;

    UPDATE public.timecard_punches
    SET voided_at = NOW(),
        voided_by = (SELECT auth.uid()),
        updated_at = NOW()
    WHERE id = p_punch_id;

    -- Clean up derived exceptions so a new punch can correctly trigger them again.
    -- We only drop 'unjustified' exceptions; if HR already justified it, we leave it.
    IF v_punch.punch_type = 'clock_in' THEN
        DELETE FROM public.attendance_exceptions
        WHERE shift_schedule_id = v_punch.shift_schedule_id
          AND type = 'late_arrival'
          AND status = 'unjustified';
    ELSIF v_punch.punch_type = 'clock_out' THEN
        DELETE FROM public.attendance_exceptions
        WHERE shift_schedule_id = v_punch.shift_schedule_id
          AND type = 'early_departure'
          AND status = 'unjustified';
    END IF;
END;
$function$
;


  create policy "attendance_exceptions_insert"
  on "public"."attendance_exceptions"
  as permissive
  for insert
  to public
with check ((public.is_claims_fresh() AND ((((auth.jwt() -> 'app_metadata'::text) -> 'domains'::text) -> 'hr'::text) ? 'c'::text)));



  create policy "attendance_exceptions_select"
  on "public"."attendance_exceptions"
  as permissive
  for select
  to public
using ((public.is_claims_fresh() AND ((((auth.jwt() -> 'app_metadata'::text) -> 'domains'::text) -> 'hr'::text) ? 'r'::text)));



  create policy "crew_zones_select"
  on "public"."crew_zones"
  as permissive
  for select
  to public
using ((public.is_claims_fresh() AND ((((auth.jwt() -> 'app_metadata'::text) -> 'domains'::text) -> 'ops'::text) ? 'r'::text)));



  create policy "leave_ledger_select"
  on "public"."leave_ledger"
  as permissive
  for select
  to public
using ((public.is_claims_fresh() AND ((((auth.jwt() -> 'app_metadata'::text) -> 'domains'::text) -> 'hr'::text) ? 'r'::text)));



  create policy "leave_requests_insert"
  on "public"."leave_requests"
  as permissive
  for insert
  to public
with check ((public.is_claims_fresh() AND ((((auth.jwt() -> 'app_metadata'::text) -> 'domains'::text) -> 'hr'::text) ? 'c'::text)));



  create policy "leave_requests_select"
  on "public"."leave_requests"
  as permissive
  for select
  to public
using ((public.is_claims_fresh() AND ((((auth.jwt() -> 'app_metadata'::text) -> 'domains'::text) -> 'hr'::text) ? 'r'::text)));



  create policy "shift_schedules_insert"
  on "public"."shift_schedules"
  as permissive
  for insert
  to public
with check ((public.is_claims_fresh() AND ((((auth.jwt() -> 'app_metadata'::text) -> 'domains'::text) -> 'hr'::text) ? 'c'::text)));



  create policy "staff_records_insert"
  on "public"."staff_records"
  as permissive
  for insert
  to authenticated
with check ((public.is_claims_fresh() AND ((((auth.jwt() -> 'app_metadata'::text) -> 'domains'::text) -> 'hr'::text) ? 'c'::text)));



  create policy "staff_records_select"
  on "public"."staff_records"
  as permissive
  for select
  to authenticated
using ((public.is_claims_fresh() AND (((((auth.jwt() -> 'app_metadata'::text) -> 'domains'::text) -> 'hr'::text) ? 'r'::text) OR (id = ( SELECT p.staff_record_id
   FROM public.profiles p
  WHERE (p.id = auth.uid()))))));



  create policy "staff_roster_assignments_insert"
  on "public"."staff_roster_assignments"
  as permissive
  for insert
  to public
with check ((public.is_claims_fresh() AND ((((auth.jwt() -> 'app_metadata'::text) -> 'domains'::text) -> 'hr'::text) ? 'c'::text)));



  create policy "staff_roster_assignments_select"
  on "public"."staff_roster_assignments"
  as permissive
  for select
  to public
using ((public.is_claims_fresh() AND ((((auth.jwt() -> 'app_metadata'::text) -> 'domains'::text) -> 'hr'::text) ? 'r'::text)));



  create policy "timecard_punches_insert"
  on "public"."timecard_punches"
  as permissive
  for insert
  to public
with check ((public.is_claims_fresh() AND ((((auth.jwt() -> 'app_metadata'::text) -> 'domains'::text) -> 'hr'::text) ? 'c'::text)));



  create policy "timecard_punches_select"
  on "public"."timecard_punches"
  as permissive
  for select
  to public
using ((public.is_claims_fresh() AND ((((auth.jwt() -> 'app_metadata'::text) -> 'domains'::text) -> 'hr'::text) ? 'r'::text)));


CREATE TRIGGER trg_leave_policy_accrual AFTER UPDATE OF leave_policy_id ON public.staff_records FOR EACH ROW EXECUTE FUNCTION public.fn_leave_policy_accrual();


