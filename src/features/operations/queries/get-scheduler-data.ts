import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// ── View-model types ──────────────────────────────────────────────────

export type ExperienceOption = Readonly<{ id: string; name: string; capacityPerSlot: number | null }>;

export type SlotRow = Readonly<{
  id: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  bookedCount: number;
  effectiveCapacity: number;
  overrideCapacity: number | null;
  constraintType: string | null;
  constraintNotes: string | null;
  loadPct: number;
}>;

export type SchedulerPageData = Readonly<{
  experiences: ExperienceOption[];
  slots: SlotRow[];
  selectedExperienceId: string | null;
  selectedDate: string | null;
}>;

// ── Query ──────────────────────────────────────────────────────────────

export const getSchedulerData = cache(
  async (params: {
    experienceId: string | undefined;
    date: string | undefined;
  }): Promise<SchedulerPageData> => {
    const supabase = await createSupabaseServerClient();

    const { data: expRows, error: eErr } = await supabase
      .from("experiences")
      .select("id, name, capacity_per_slot")
      .order("name", { ascending: true });
    if (eErr) throw eErr;

    const experiences: ExperienceOption[] = (expRows ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      capacityPerSlot: r.capacity_per_slot,
    }));

    const expId = params.experienceId ?? experiences[0]?.id;
    if (!expId) return { experiences, slots: [], selectedExperienceId: null, selectedDate: null };

    const selectedExp = experiences.find((e) => e.id === expId);
    const defaultCap = selectedExp?.capacityPerSlot ?? 50;

    let builder = supabase
      .from("time_slots")
      .select("id, slot_date, start_time, end_time, booked_count, override_capacity, constraint_type, constraint_notes")
      .eq("experience_id", expId)
      .order("slot_date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(500);

    if (params.date) {
      builder = builder.eq("slot_date", params.date);
    } else {
      const today = new Date().toISOString().split("T")[0];
      builder = builder.gte("slot_date", today);
    }

    const { data: slotRows, error: sErr } = await builder;
    if (sErr) throw sErr;

    const slots: SlotRow[] = (slotRows ?? []).map((r) => {
      const effectiveCap = r.override_capacity ?? defaultCap;
      const booked = r.booked_count ?? 0;
      return {
        id: r.id,
        slotDate: r.slot_date,
        startTime: r.start_time,
        endTime: r.end_time,
        bookedCount: booked,
        effectiveCapacity: effectiveCap,
        overrideCapacity: r.override_capacity,
        constraintType: r.constraint_type,
        constraintNotes: r.constraint_notes,
        loadPct: effectiveCap > 0 ? Math.round((booked / effectiveCap) * 100) : 0,
      };
    });

    return { experiences, slots, selectedExperienceId: expId, selectedDate: params.date ?? null };
  },
);
