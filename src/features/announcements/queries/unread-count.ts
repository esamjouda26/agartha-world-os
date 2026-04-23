import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Resolve the caller's unread-announcement count — used by the topbar
 * bell badge. Wraps `rpc_get_unread_announcement_count()` (added in
 * 20260422140000_add_announcement_crud_rpcs.sql) so visibility semantics
 * live in exactly one place (Postgres).
 *
 * Cache model (ADR-0006): React `cache()` per-request dedup. Layouts
 * resolve the count once per request; revalidatePath on mutation flushes
 * the RSC payload so next navigation re-reads.
 */
export const resolveUnreadAnnouncementCount = cache(async (): Promise<number> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("rpc_get_unread_announcement_count");
  if (error) throw error;
  return typeof data === "number" ? data : 0;
});
