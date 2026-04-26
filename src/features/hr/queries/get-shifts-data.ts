import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  ShiftPageData,
  ShiftTypeRow,
  RosterTemplateRow,
  RosterTemplateShiftRow,
  StaffAssignmentRow,
  PublicHolidayRow,
} from "@/features/hr/types/shifts";

/**
 * RSC query — static reference data for /management/hr/shifts.
 *
 * Schedule overview is NOT fetched here — it is paginated separately
 * via `listScheduleOverview`. This bundle covers the tabs that are
 * fully client-side (templates, daily editor) and the dropdown data
 * shared across all tabs.
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup only.
 */
export const getShiftsData = cache(
  async (client: SupabaseClient<Database>): Promise<ShiftPageData> => {
    const now = new Date();

    const [shiftTypesRes, templatesRes, templateShiftsRes, assignmentsRes, holidaysRes, staffRes] =
      await Promise.all([
        // 1. Shift types
        client.from("shift_types").select("*").order("name", { ascending: true }),

        // 2. Roster templates
        client.from("roster_templates").select("*").order("name", { ascending: true }),

        // 3. Template shifts with shift type name
        client
          .from("roster_template_shifts")
          .select("id, template_id, day_index, shift_type_id, shift_types ( name )")
          .order("day_index", { ascending: true }),

        // 4. Staff assignments with staff + template names
        client
          .from("staff_roster_assignments")
          .select(
            `id, staff_record_id, roster_template_id, effective_start_date, effective_end_date,
           staff_records ( legal_name, profiles ( display_name ) ),
           roster_templates ( name )`,
          )
          .order("effective_start_date", { ascending: false }),

        // 5. Public holidays (current year + next year)
        client
          .from("public_holidays")
          .select("id, holiday_date, name")
          .gte("holiday_date", `${now.getFullYear()}-01-01`)
          .order("holiday_date", { ascending: true }),

        // 6. Staff options for assignment dropdown
        client
          .from("staff_records")
          .select("id, legal_name, profiles ( display_name )")
          .order("legal_name", { ascending: true }),
      ]);

    if (shiftTypesRes.error) throw shiftTypesRes.error;
    if (templatesRes.error) throw templatesRes.error;
    if (templateShiftsRes.error) throw templateShiftsRes.error;
    if (assignmentsRes.error) throw assignmentsRes.error;
    if (holidaysRes.error) throw holidaysRes.error;
    if (staffRes.error) throw staffRes.error;

    // ── Map shift types ────────────────────────────────────────────────
    const shiftTypes: ShiftTypeRow[] = (shiftTypesRes.data ?? []).map((st) => ({
      id: st.id,
      code: st.code,
      name: st.name,
      startTime: st.start_time,
      endTime: st.end_time,
      breakDurationMinutes: st.break_duration_minutes,
      graceLateArrivalMinutes: st.grace_late_arrival_minutes,
      graceEarlyDepartureMinutes: st.grace_early_departure_minutes,
      maxLateClockInMinutes: st.max_late_clock_in_minutes,
      maxEarlyClockInMinutes: st.max_early_clock_in_minutes,
      maxLateClockOutMinutes: st.max_late_clock_out_minutes,
      color: st.color ?? null,
      isActive: st.is_active,
    }));

    // ── Map roster templates ───────────────────────────────────────────
    const rosterTemplates: RosterTemplateRow[] = (templatesRes.data ?? []).map((rt) => ({
      id: rt.id,
      name: rt.name,
      cycleLengthDays: rt.cycle_length_days,
      anchorDate: rt.anchor_date,
      isActive: rt.is_active,
      createdAt: rt.created_at,
    }));

    // ── Map template shifts ────────────────────────────────────────────
    const templateShifts = (templateShiftsRes.data ?? []).map((ts) => {
      const shiftType = ts.shift_types as { name: string } | null;
      return {
        id: ts.id,
        templateId: ts.template_id,
        dayIndex: ts.day_index,
        shiftTypeId: ts.shift_type_id,
        shiftTypeName: shiftType?.name,
      };
    });

    // ── Map staff assignments ──────────────────────────────────────────
    const staffAssignments: StaffAssignmentRow[] = (assignmentsRes.data ?? []).map((a) => {
      const sr = a.staff_records as unknown as {
        legal_name: string;
        profiles: { display_name: string | null } | null;
      } | null;
      const tmpl = a.roster_templates as { name: string } | null;
      return {
        id: a.id,
        staffRecordId: a.staff_record_id,
        staffName: sr?.profiles?.display_name ?? sr?.legal_name ?? "Unknown",
        rosterTemplateId: a.roster_template_id,
        rosterTemplateName: tmpl?.name ?? "Unknown",
        effectiveStartDate: a.effective_start_date,
        effectiveEndDate: a.effective_end_date,
      };
    });

    // ── Map holidays ───────────────────────────────────────────────────
    const holidays: PublicHolidayRow[] = (holidaysRes.data ?? []).map((h) => ({
      id: h.id,
      holidayDate: h.holiday_date,
      name: h.name,
    }));

    // ── Map staff options ──────────────────────────────────────────────
    const staffOptions = (staffRes.data ?? []).map((s) => {
      const profile = s.profiles as unknown as { display_name: string | null } | null;
      return {
        id: s.id,
        name: profile?.display_name ?? s.legal_name,
      };
    });

    return {
      shiftTypes,
      rosterTemplates,
      templateShifts: templateShifts as readonly RosterTemplateShiftRow[],
      staffAssignments,
      holidays,
      staffOptions,
    };
  },
);
