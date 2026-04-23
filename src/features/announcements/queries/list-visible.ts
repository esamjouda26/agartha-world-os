import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Shape returned to the topbar bell dropdown. Matches the columns
 * `get_visible_announcements()` returns
 * ([init_schema.sql:4958-5001](../../../../supabase/migrations/20260417064731_init_schema.sql#L4958)).
 */
export type VisibleAnnouncement = Readonly<{
  id: string;
  title: string;
  content: string;
  createdAt: string;
  expiresAt: string | null;
  createdByName: string | null;
  isRead: boolean;
}>;

/**
 * List announcements visible to the caller via
 * `get_visible_announcements(p_unread_only)` — SECURITY DEFINER RPC that
 * returns published + audience-matched + non-expired rows, with an
 * `is_read` flag derived from the caller's `announcement_reads`.
 *
 * Cache model (ADR-0006): React `cache()` per-request dedup. The RPC is
 * called twice today (bell list + unread count) — `cache()` collapses
 * those to a single fetch per request when the args match.
 */
export const listVisibleAnnouncements = cache(
  async (unreadOnly = false): Promise<VisibleAnnouncement[]> => {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .rpc("get_visible_announcements", { p_unread_only: unreadOnly })
      .limit(30);
    if (error) throw error;
    if (!data) return [];

    return data.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      createdByName: row.created_by_name,
      isRead: row.is_read,
    }));
  },
);
