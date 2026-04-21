import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { ExceptionRow } from "@/features/attendance/types";

/**
 * Tab-2 loader — own exceptions joined with shift_schedule + shift_type
 * for display context, plus the clock-in punch remark per WF-5, plus
 * clarification attachments per ADR-0007.
 *
 * Sort contract from frontend_spec.md:4238 (as adjusted by ADR-0007):
 * unresolved work first (`unjustified` then `rejected` — both need
 * staff action — then `pending_review`), then terminal `justified` at
 * the bottom. Within each bucket, newest-submitted first.
 */
export const getOwnExceptions = cache(
  async (
    client: SupabaseClient<Database>,
    staffRecordId: string,
  ): Promise<ReadonlyArray<ExceptionRow>> => {
    const { data, error } = await client
      .from("attendance_exceptions")
      .select(
        `id, type, status, detail, staff_clarification, hr_note,
         clarification_submitted_at, reviewed_at, created_at,
         shift_schedule:shift_schedules!inner (
           id,
           shift_date,
           shift_type:shift_types!inner ( name, code )
         ),
         attachments:attendance_clarification_attachments (
           id, file_path, file_name, mime_type, file_size_bytes, created_at
         )`,
      )
      .eq("staff_record_id", staffRecordId)
      .order("status", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!data) return [];

    // Punch remark is pulled in a single follow-up query keyed by the set
    // of schedule ids — avoids N+1. Single IN projection is O(|exceptions|)
    // in one round-trip.
    const scheduleIds = Array.from(
      new Set(
        data
          .map((row) => (row.shift_schedule as { id?: string } | null)?.id)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const remarkByScheduleId = new Map<string, string | null>();
    if (scheduleIds.length > 0) {
      const { data: remarkRows, error: remarkErr } = await client
        .from("timecard_punches")
        .select("shift_schedule_id, remark, punch_type")
        .in("shift_schedule_id", scheduleIds)
        .eq("punch_type", "clock_in")
        .is("voided_at", null);

      if (remarkErr) throw remarkErr;
      for (const row of remarkRows ?? []) {
        remarkByScheduleId.set(row.shift_schedule_id, row.remark ?? null);
      }
    }

    return data.map((row) => {
      const shiftSchedule = row.shift_schedule as {
        id: string;
        shift_date: string;
        shift_type: { name: string | null; code: string | null } | null;
      } | null;
      const attachments = (row.attachments ?? []) as ReadonlyArray<{
        id: string;
        file_path: string;
        file_name: string;
        mime_type: string;
        file_size_bytes: number;
        created_at: string;
      }>;
      return {
        id: row.id,
        shift_date: shiftSchedule?.shift_date ?? "",
        shift_type_name: shiftSchedule?.shift_type?.name ?? null,
        shift_type_code: shiftSchedule?.shift_type?.code ?? null,
        type: row.type,
        status: row.status,
        detail: row.detail ?? null,
        punch_remark: shiftSchedule ? (remarkByScheduleId.get(shiftSchedule.id) ?? null) : null,
        staff_clarification: row.staff_clarification ?? null,
        hr_note: row.hr_note ?? null,
        clarification_submitted_at: row.clarification_submitted_at ?? null,
        reviewed_at: row.reviewed_at ?? null,
        created_at: row.created_at,
        attachments: attachments.map((a) => ({
          id: a.id,
          file_path: a.file_path,
          file_name: a.file_name,
          mime_type: a.mime_type,
          file_size_bytes: a.file_size_bytes,
          created_at: a.created_at,
        })),
      } satisfies ExceptionRow;
    });
  },
);
