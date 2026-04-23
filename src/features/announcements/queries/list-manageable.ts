import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Shape returned to the management route's list view. Serialisable —
 * dates are ISO strings.
 */
export type ManageableAnnouncement = Readonly<{
  id: string;
  title: string;
  content: string;
  isPublished: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  createdBy: string | null;
  createdByName: string;
  targets: ReadonlyArray<
    | { targetType: "global" }
    | { targetType: "role"; roleId: string }
    | { targetType: "org_unit"; orgUnitId: string }
    | { targetType: "user"; userId: string }
  >;
}>;

/**
 * List announcements the caller can manage.
 *
 * Admins (`hasSystemRead=true`) see every row. Managers see only rows
 * where `created_by = auth.uid()` — they own what they published. RLS
 * enforces `comms:r` at minimum; the `created_by` filter is the app-layer
 * scope on top (RLS can't differentiate "own" vs "all").
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup only.
 * Multi-step fetch (announcements then targets by parent IDs) joins
 * client-side. Single round-trip per table; no N+1.
 */
export const listManageableAnnouncements = cache(
  async (params: { userId: string; hasSystemRead: boolean }): Promise<ManageableAnnouncement[]> => {
    const supabase = await createSupabaseServerClient();

    let builder = supabase
      .from("announcements")
      .select("id, title, content, is_published, expires_at, created_at, updated_at, created_by")
      .order("is_published", { ascending: true }) // Drafts first (false < true is swapped on ordering)
      .order("created_at", { ascending: false });

    if (!params.hasSystemRead) {
      builder = builder.eq("created_by", params.userId);
    }

    const { data: rows, error } = await builder;
    if (error) throw error;
    if (!rows || rows.length === 0) return [];

    const ids = rows.map((r) => r.id);

    // Targets — single round-trip.
    const { data: targetRows, error: tErr } = await supabase
      .from("announcement_targets")
      .select("announcement_id, target_type, role_id, org_unit_id, user_id")
      .in("announcement_id", ids);
    if (tErr) throw tErr;

    // Creator names — single round-trip.
    const creatorIds = Array.from(
      new Set(rows.map((r) => r.created_by).filter((v): v is string => v !== null)),
    );
    const creatorsById = new Map<string, string>();
    if (creatorIds.length > 0) {
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", creatorIds);
      if (pErr) throw pErr;
      for (const p of profiles ?? []) {
        creatorsById.set(p.id, p.display_name ?? "");
      }
    }

    const targetsByAnnouncement = new Map<string, ManageableAnnouncement["targets"][number][]>();
    for (const t of targetRows ?? []) {
      const list = targetsByAnnouncement.get(t.announcement_id) ?? [];
      list.push(mapTargetRow(t));
      targetsByAnnouncement.set(t.announcement_id, list);
    }

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      isPublished: row.is_published ?? false,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      createdByName: row.created_by ? (creatorsById.get(row.created_by) ?? "") : "",
      targets: targetsByAnnouncement.get(row.id) ?? [],
    }));
  },
);

function mapTargetRow(row: {
  target_type: "global" | "role" | "org_unit" | "user";
  role_id: string | null;
  org_unit_id: string | null;
  user_id: string | null;
}): ManageableAnnouncement["targets"][number] {
  switch (row.target_type) {
    case "global":
      return { targetType: "global" };
    case "role":
      // CHECK constraint guarantees role_id is present — the `!` is the
      // pragma we reach for when the DB invariant is stronger than TS.
      return { targetType: "role", roleId: row.role_id! };
    case "org_unit":
      return { targetType: "org_unit", orgUnitId: row.org_unit_id! };
    case "user":
      return { targetType: "user", userId: row.user_id! };
  }
}
