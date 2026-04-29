"use server";

import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Returns distinct ISO-date strings (YYYY-MM-DD) for which the scheduler
 * has generated time slots, starting from today.
 *
 * Used by the booking calendar to show only selectable dates rather than
 * a hardcoded window.
 */
export async function getAvailableDatesAction(
  experienceId: string,
): Promise<{ success: true; data: string[] } | { success: false; error: string }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("rpc_get_available_dates", {
    p_experience_id: experienceId,
  });

  if (error) {
    return { success: false, error: "DEPENDENCY_FAILED" };
  }

  const dates = (data as { slot_date: string }[]).map((r) => r.slot_date);

  return { success: true, data: dates };
}
