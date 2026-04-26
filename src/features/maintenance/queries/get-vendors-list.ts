import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  VendorListKpis,
  VendorListRow,
  VendorsListData,
} from "@/features/maintenance/types";

/**
 * RSC payload for `/management/maintenance/vendors`
 * (frontend_spec.md:2704-2738). Returns every vendor + per-vendor open
 * WO count + last WO date, computed from the existing
 * `maintenance_orders` rows the manager already has read access to.
 *
 * Cache model (ADR-0006): React `cache()` per-request dedup. Both
 * `maintenance_vendors` and `maintenance_orders` are gated behind
 * `maintenance:r`; the manager seed (init_schema.sql:737) holds the
 * full crud quad.
 */
export const getVendorsList = cache(
  async (client: SupabaseClient<Database>): Promise<VendorsListData> => {
    const [vendorsRes, ordersRes] = await Promise.all([
      client
        .from("maintenance_vendors")
        .select(
          "id, name, contact_email, contact_phone, specialization, description, is_active",
        )
        .order("name", { ascending: true }),
      // Project only what the aggregator needs — vendor_id + status +
      // window timestamps. Avoids pulling full WO rows just to count.
      client
        .from("maintenance_orders")
        .select("vendor_id, status, maintenance_end, maintenance_start"),
    ]);
    if (vendorsRes.error) throw vendorsRes.error;
    if (ordersRes.error) throw ordersRes.error;

    // ── Aggregate per-vendor: open count + last WO end ──────────────
    const openByVendor = new Map<string, number>();
    const lastByVendor = new Map<string, string>();

    for (const o of ordersRes.data ?? []) {
      if (!o.vendor_id) continue;
      const isOpen = o.status === "draft" || o.status === "scheduled" || o.status === "active";
      if (isOpen) {
        openByVendor.set(o.vendor_id, (openByVendor.get(o.vendor_id) ?? 0) + 1);
      }
      const window = o.maintenance_end ?? o.maintenance_start;
      if (!window) continue;
      const prev = lastByVendor.get(o.vendor_id);
      if (!prev || new Date(window) > new Date(prev)) {
        lastByVendor.set(o.vendor_id, window);
      }
    }

    let availableCount = 0;
    let busyCount = 0;
    let inactiveCount = 0;

    const rows: VendorListRow[] = (vendorsRes.data ?? []).map((v) => {
      const isActive = v.is_active ?? true;
      const openWoCount = openByVendor.get(v.id) ?? 0;
      if (!isActive) inactiveCount += 1;
      else if (openWoCount > 0) busyCount += 1;
      else availableCount += 1;
      return {
        id: v.id,
        name: v.name,
        contactEmail: v.contact_email,
        contactPhone: v.contact_phone,
        specialization: v.specialization,
        description: v.description,
        isActive,
        openWoCount,
        lastWoAt: lastByVendor.get(v.id) ?? null,
      };
    });

    const kpis: VendorListKpis = {
      available: availableCount,
      busy: busyCount,
      inactive: inactiveCount,
    };

    return { rows, kpis };
  },
);
