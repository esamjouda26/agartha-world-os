import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  PODetailData,
  PODetailLineItem,
  ReceivingHistoryRow,
  PoStatus,
} from "@/features/procurement/types";

/**
 * RSC query — all data for /management/procurement/purchase-orders/[id].
 *
 * Spec: frontend_spec.md §3b `/management/procurement/purchase-orders/[id]`
 *   RSC fetches: purchase_orders WHERE id = param JOIN suppliers JOIN locations,
 *                purchase_order_items WHERE po_id = param JOIN materials (name) JOIN units (abbreviation)
 *   + goods_movements WHERE purchase_order_id = this PO
 *
 * Cache model (ADR-0006): React `cache()` — request-scoped dedup only.
 */
export const getPurchaseOrderDetail = cache(
  async (
    client: SupabaseClient<Database>,
    poId: string,
  ): Promise<PODetailData | null> => {
    // ── 1. Parallel fetches ───────────────────────────────────────
    const [poResult, itemsResult, gmResult, materialsResult] = await Promise.all([
      // PO header + supplier + location
      client
        .from("purchase_orders")
        .select(
          `
          id,
          supplier_id,
          status,
          order_date,
          expected_delivery_date,
          notes,
          created_at,
          suppliers ( id, name, contact_email, contact_phone ),
          locations ( id, name )
          `,
        )
        .eq("id", poId)
        .maybeSingle(),

      // Line items + material name (+ base_unit_id for unit resolution)
      client
        .from("purchase_order_items")
        .select(
          `
          id,
          material_id,
          expected_qty,
          received_qty,
          unit_price,
          photo_proof_url,
          materials ( id, name, base_unit_id )
          `,
        )
        .eq("po_id", poId)
        .order("created_at", { ascending: true }),

      // Receiving history: goods_movements linked to this PO
      client
        .from("goods_movements")
        .select(
          `
          id,
          document_date,
          created_by,
          profiles:created_by ( display_name ),
          goods_movement_items (
            quantity,
            material_id,
            materials ( name ),
            units:unit_id ( abbreviation )
          )
          `,
        )
        .eq("purchase_order_id", poId)
        .order("document_date", { ascending: false }),

      // Reference materials for add-line-item form
      client
        .from("materials")
        .select("id, name, sku")
        .eq("is_active", true)
        .order("name", { ascending: true }),
    ]);

    // ── 2. Bail if PO not found ──────────────────────────────────
    if (poResult.error || !poResult.data) return null;

    const po = poResult.data;
    const supplier = po.suppliers as {
      id: string;
      name: string;
      contact_email: string | null;
      contact_phone: string | null;
    } | null;
    const location = po.locations as { id: string; name: string } | null;

    // ── 3. Map line items ────────────────────────────────────────
    // Since we can't join through the FK chain in one hop, fetch units separately
    const unitIds = new Set<string>();
    const rawItems = (itemsResult.data ?? []) as Array<{
      id: string;
      material_id: string;
      expected_qty: number;
      received_qty: number | null;
      unit_price: number;
      photo_proof_url: string | null;
      materials: { id: string; name: string; base_unit_id: string } | null;
    }>;

    for (const item of rawItems) {
      if (item.materials?.base_unit_id) unitIds.add(item.materials.base_unit_id);
    }

    // Fetch unit abbreviations for all needed units
    let unitMap = new Map<string, string>();
    if (unitIds.size > 0) {
      const { data: unitsData } = await client
        .from("units")
        .select("id, abbreviation")
        .in("id", Array.from(unitIds));
      if (unitsData) {
        unitMap = new Map(unitsData.map((u) => [u.id, u.abbreviation]));
      }
    }

    const lineItems: PODetailLineItem[] = rawItems.map((item) => {
      const expectedQty = Number(item.expected_qty);
      const receivedQty = Number(item.received_qty ?? 0);
      const unitPrice = Number(item.unit_price);
      return {
        id: item.id,
        materialId: item.material_id,
        materialName: (item.materials as { name: string } | null)?.name ?? "Unknown",
        expectedQty,
        receivedQty,
        unitPrice,
        lineTotal: expectedQty * unitPrice,
        unitAbbreviation: unitMap.get(
          (item.materials as { base_unit_id: string } | null)?.base_unit_id ?? "",
        ) ?? null,
        photoProofUrl: item.photo_proof_url,
      };
    });

    const totalValue = lineItems.reduce((sum, i) => sum + i.lineTotal, 0);

    // ── 4. Map receiving history ─────────────────────────────────
    const receivingHistory: ReceivingHistoryRow[] = (gmResult.data ?? []).map(
      (gm) => {
        // `gm.profiles` resolves through created_by FK; PostgREST cannot
        // auto-introspect that relation, so the typegen returns a
        // SelectQueryError. Cast through `unknown` per the TS error hint.
        const profile = gm.profiles as unknown as
          | { display_name: string | null }
          | null;
        const gmItems = (gm.goods_movement_items ?? []) as Array<{
          quantity: number;
          material_id: string;
          materials: { name: string } | null;
          units: { abbreviation: string } | null;
        }>;
        return {
          id: gm.id,
          documentDate: gm.document_date,
          receivedByName: profile?.display_name ?? null,
          items: gmItems.map((gi) => ({
            materialName: gi.materials?.name ?? "Unknown",
            quantity: Number(gi.quantity),
            unitAbbreviation: gi.units?.abbreviation ?? "??",
          })),
        };
      },
    );

    return {
      id: po.id,
      supplierName: supplier?.name ?? "Unknown",
      supplierContactEmail: supplier?.contact_email ?? null,
      supplierContactPhone: supplier?.contact_phone ?? null,
      status: (po.status ?? "draft") as PoStatus,
      orderDate: po.order_date,
      expectedDeliveryDate: po.expected_delivery_date,
      receivingLocationName: location?.name ?? null,
      notes: po.notes,
      totalValue,
      createdAt: po.created_at,
      lineItems,
      receivingHistory,
      materials: (materialsResult.data ?? []).map((m) => ({
        id: m.id,
        name: m.name,
        sku: m.sku,
      })),
    };
  },
);
