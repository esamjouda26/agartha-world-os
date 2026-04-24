import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  ZonesPageData,
  LocationRow,
  ZoneRow,
  LocationCategoryEntry,
} from "@/features/zones/types/zone";

/**
 * RSC query — all data for /admin/zones.
 * Parallel fetches for locations, zones, org_units, material_categories,
 * and location_allowed_categories.
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup only.
 */
export const getZonesPage = cache(
  async (client: SupabaseClient<Database>): Promise<ZonesPageData> => {
    const [locationsResult, zonesResult, orgUnitsResult, categoriesResult, assignmentsResult] =
      await Promise.all([
        // 1. Locations with org_unit name
        client
          .from("locations")
          .select(
            "id, name, org_unit_id, is_active, created_at, org_units!locations_org_unit_id_fkey ( name, code )",
          )
          .order("name", { ascending: true }),

        // 2. Zones with location name
        client
          .from("zones")
          .select(
            "id, name, description, capacity, location_id, is_active, created_at, locations!zones_location_id_fkey ( name )",
          )
          .order("name", { ascending: true }),

        // 3. All active org units for location create/edit dropdown
        client
          .from("org_units")
          .select("id, name, code")
          .eq("is_active", true)
          .order("name", { ascending: true }),

        // 4. Material categories for category assignment
        client
          .from("material_categories")
          .select("id, name, code, depth")
          .eq("is_active", true)
          .order("path", { ascending: true }),

        // 5. Current location_allowed_categories assignments
        client.from("location_allowed_categories").select("location_id, category_id"),
      ]);

    if (locationsResult.error) throw locationsResult.error;
    if (zonesResult.error) throw zonesResult.error;
    if (orgUnitsResult.error) throw orgUnitsResult.error;
    if (categoriesResult.error) throw categoriesResult.error;
    if (assignmentsResult.error) throw assignmentsResult.error;

    // ── Map locations ─────────────────────────────────────────────────
    const locations: LocationRow[] = (locationsResult.data ?? []).map((l) => {
      const ou = l.org_units as { name: string; code: string } | null;
      return {
        id: l.id,
        name: l.name,
        orgUnitId: l.org_unit_id ?? null,
        orgUnitName: ou?.name ?? null,
        isActive: l.is_active ?? true,
        createdAt: l.created_at,
      };
    });

    // ── Map zones ─────────────────────────────────────────────────────
    const zones: ZoneRow[] = (zonesResult.data ?? []).map((z) => {
      const loc = z.locations as { name: string } | null;
      return {
        id: z.id,
        name: z.name,
        description: z.description ?? null,
        capacity: z.capacity,
        locationId: z.location_id,
        locationName: loc?.name ?? "Unknown",
        isActive: z.is_active ?? true,
        createdAt: z.created_at,
      };
    });

    // ── Group category assignments by location ─────────────────────────
    const catMap = new Map<string, string[]>();
    for (const row of assignmentsResult.data ?? []) {
      const existing = catMap.get(row.location_id) ?? [];
      existing.push(row.category_id);
      catMap.set(row.location_id, existing);
    }
    const locationCategories: LocationCategoryEntry[] = Array.from(catMap.entries()).map(
      ([locationId, categoryIds]) => ({ locationId, categoryIds }),
    );

    return {
      locations,
      zones,
      orgUnits: (orgUnitsResult.data ?? []).map((ou) => ({
        id: ou.id,
        name: ou.name,
        code: ou.code,
      })),
      materialCategories: (categoriesResult.data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code ?? null,
        depth: c.depth,
      })),
      locationCategories,
    };
  },
);
