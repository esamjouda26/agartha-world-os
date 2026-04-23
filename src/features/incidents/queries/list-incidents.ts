import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  categoriesForGroups,
  type IncidentCategory,
  type IncidentGroupKey,
} from "@/features/incidents/constants";

/**
 * Row shape consumed by `IncidentLogPage`. Flattened from the multi-table
 * RSC fetch (incidents + zones + profiles + resolver profile). All dates
 * serialized as ISO strings for the RSC→client boundary.
 */
export type IncidentRow = Readonly<{
  id: string;
  category: IncidentCategory;
  status: "open" | "resolved";
  description: string;
  createdAt: string;
  resolvedAt: string | null;
  zoneId: string | null;
  zoneName: string | null;
  createdBy: string | null;
  reporterName: string;
  resolvedBy: string | null;
  resolverName: string;
  attachmentUrl: string | null;
  resolutionNotes: string | null;
}>;

/**
 * List incidents visible to the caller.
 *
 * - `allowedGroups` narrows by category (driven by the Pattern C prop
 *   injected by each route wrapper — ops gets 5 groups, maintenance
 *   gets 2, crew gets all 7).
 * - `ownOnly=true` additionally restricts to `created_by = auth.uid()` —
 *   the crew view uses this. Managers see the full list for their
 *   allowed categories.
 *
 * Cache model (ADR-0006): React `cache()` per-request dedup. Three
 * round-trips total (incidents + zones-by-id + profiles-by-id) — no
 * per-row loop queries.
 */
export const listIncidents = cache(
  async (params: {
    userId: string;
    allowedGroups: readonly IncidentGroupKey[];
    ownOnly: boolean;
  }): Promise<IncidentRow[]> => {
    const supabase = await createSupabaseServerClient();
    const categories = categoriesForGroups(params.allowedGroups);
    if (categories.length === 0) return [];

    let builder = supabase
      .from("incidents")
      .select(
        "id, category, status, description, zone_id, attachment_url, metadata, resolved_by, resolved_at, created_at, created_by",
      )
      .in("category", [...categories])
      .order("status", { ascending: true }) // open first (alphabetical; 'open' < 'resolved')
      .order("created_at", { ascending: false });

    if (params.ownOnly) {
      builder = builder.eq("created_by", params.userId);
    }

    const { data: rows, error } = await builder;
    if (error) throw error;
    if (!rows || rows.length === 0) return [];

    // Zone names — single round-trip.
    const zoneIds = Array.from(
      new Set(rows.map((r) => r.zone_id).filter((v): v is string => v !== null)),
    );
    const zoneNamesById = new Map<string, string>();
    if (zoneIds.length > 0) {
      const { data: zones, error: zErr } = await supabase
        .from("zones")
        .select("id, name")
        .in("id", zoneIds);
      if (zErr) throw zErr;
      for (const z of zones ?? []) zoneNamesById.set(z.id, z.name);
    }

    // Reporter + resolver names — single round-trip.
    const profileIds = Array.from(
      new Set(
        rows.flatMap((r) => [r.created_by, r.resolved_by]).filter((v): v is string => v !== null),
      ),
    );
    const displayNameById = new Map<string, string>();
    if (profileIds.length > 0) {
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", profileIds);
      if (pErr) throw pErr;
      for (const p of profiles ?? []) displayNameById.set(p.id, p.display_name ?? "");
    }

    // Resolve public URLs for attachments that live in the `operations` bucket.
    // `attachment_url` is stored as the bucket-relative path; we expand here
    // into the signed/public URL the client component can render.
    const resolveUrl = (path: string | null): string | null => {
      if (!path) return null;
      // Short-circuit for historical rows that already stored a full URL.
      if (path.startsWith("http")) return path;
      const { data } = supabase.storage.from("operations").getPublicUrl(path);
      return data.publicUrl;
    };

    return rows.map((row) => {
      const meta = (row.metadata ?? {}) as Record<string, unknown>;
      const resolutionNotes =
        typeof meta.resolution_notes === "string" ? meta.resolution_notes : null;
      return {
        id: row.id,
        category: row.category,
        status: row.status ?? "open",
        description: row.description,
        createdAt: row.created_at,
        resolvedAt: row.resolved_at,
        zoneId: row.zone_id,
        zoneName: row.zone_id ? (zoneNamesById.get(row.zone_id) ?? null) : null,
        createdBy: row.created_by,
        reporterName: row.created_by ? (displayNameById.get(row.created_by) ?? "") : "",
        resolvedBy: row.resolved_by,
        resolverName: row.resolved_by ? (displayNameById.get(row.resolved_by) ?? "") : "",
        attachmentUrl: resolveUrl(row.attachment_url),
        resolutionNotes,
      };
    });
  },
);
