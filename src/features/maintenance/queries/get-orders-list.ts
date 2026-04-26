import "server-only";

import { cache } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  MoStatus,
  MoTopology,
  OrderFormContext,
  OrderListKpis,
  OrderListRow,
  OrderSectionCounts,
  OrdersListData,
} from "@/features/maintenance/types";

/**
 * RSC payload for `/management/maintenance/orders`
 * (frontend_spec.md:2659-2702 + WF-15 in operational_workflows.md:1303).
 *
 * Cache model (ADR-0006): React `cache()` per-request dedup.
 *
 * Architecture notes:
 *   - `maintenance_orders` is Tier-3b RLS — managers with `maintenance:d`
 *     see all rows; sponsors only see their own. Maintenance manager
 *     seed (init_schema.sql:737) grants full crud, so this query returns
 *     every row for the manager.
 *   - Sponsor display name is resolved via `profiles` (Tier-1, universal
 *     read) keyed on `staff_record_id`, NOT through `staff_records`
 *     (Tier-4 hr:r — manager doesn't hold). PostgREST cannot auto-join
 *     `maintenance_orders.sponsor_id → profiles.staff_record_id` (it's
 *     not a declared FK) so we fetch profiles separately and merge.
 *   - The form-context picker for "select sponsor with maintenance:c"
 *     also crosses an RBAC boundary (`role_domain_permissions` is
 *     `system:r`-gated) so it routes through
 *     `rpc_get_maintenance_sponsors()`
 *     ([20260426000000_add_rpc_get_maintenance_sponsors.sql](../../../../supabase/migrations/20260426000000_add_rpc_get_maintenance_sponsors.sql)).
 */
export const getOrdersList = cache(
  async (client: SupabaseClient<Database>): Promise<OrdersListData> => {
    // ── 1. Orders + devices(zone) + vendor (PostgREST embedded joins) ────
    const { data: rawOrders, error: ordersErr } = await client
      .from("maintenance_orders")
      .select(
        `
        id,
        topology,
        status,
        target_ci_id,
        vendor_id,
        sponsor_id,
        sponsor_remark,
        switch_port,
        network_group,
        scope,
        vendor_mac_address,
        maintenance_start,
        maintenance_end,
        mad_limit_minutes,
        authorized_at,
        completed_at,
        created_at,
        updated_at,
        devices ( name, zones ( name ) ),
        maintenance_vendors ( name )
        `,
      )
      .order("maintenance_start", { ascending: false });
    if (ordersErr) throw ordersErr;

    // ── 2. Sponsor display names (profiles, Tier-1 — manager has read) ───
    const sponsorIds = Array.from(
      new Set(
        (rawOrders ?? [])
          .map((o) => o.sponsor_id)
          .filter((id): id is string => id !== null),
      ),
    );

    const sponsorNameMap = new Map<string, string>();
    if (sponsorIds.length > 0) {
      const { data: sponsorProfiles, error: profErr } = await client
        .from("profiles")
        .select("display_name, staff_record_id")
        .in("staff_record_id", sponsorIds);
      if (profErr) throw profErr;
      for (const row of sponsorProfiles ?? []) {
        if (row.staff_record_id && row.display_name) {
          sponsorNameMap.set(row.staff_record_id, row.display_name);
        }
      }
    }

    // ── 3. Form-context lookups ─────────────────────────────────────────
    const [devicesRes, vendorsRes, sponsorsRes] = await Promise.all([
      client
        .from("devices")
        .select("id, name, zones ( name )")
        .order("name", { ascending: true }),
      client
        .from("maintenance_vendors")
        .select("id, name, specialization")
        .eq("is_active", true)
        .order("name", { ascending: true }),
      client.rpc("rpc_get_maintenance_sponsors"),
    ]);
    if (devicesRes.error) throw devicesRes.error;
    if (vendorsRes.error) throw vendorsRes.error;
    if (sponsorsRes.error) throw sponsorsRes.error;

    // ── 4. Project rows + KPIs + counts ─────────────────────────────────
    const now = Date.now();
    const startOfWeek = new Date();
    // ISO week starts Monday — frontend_spec.md uses week-rolling KPIs.
    const dayIdx = (startOfWeek.getDay() + 6) % 7; // 0=Mon
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - dayIdx);
    const startOfWeekMs = startOfWeek.getTime();

    let activeSessions = 0;
    let scheduledCount = 0;
    let overdueCount = 0;
    let completedThisWeekCount = 0;
    let liveCount = 0;
    let queueCount = 0;
    let historyCount = 0;

    const rows: OrderListRow[] = (rawOrders ?? []).map((o) => {
      const status = (o.status ?? "draft") as MoStatus;
      const topology = o.topology as MoTopology;

      const device = o.devices as
        | { name: string; zones: { name: string } | null }
        | null;
      const vendor = o.maintenance_vendors as { name: string } | null;
      const endMs = new Date(o.maintenance_end).getTime();

      // ── Section bucketing ───────────────────────────────────────────
      if (status === "active") {
        liveCount += 1;
        activeSessions += 1;
        // Active orders past `maintenance_end` are computed-overdue
        // (computed_status() in init_schema.sql:3642 auto-completes
        // them, but the row hasn't been UPDATEd yet).
        if (endMs < now) overdueCount += 1;
      } else if (status === "draft" || status === "scheduled") {
        queueCount += 1;
        if (status === "scheduled") {
          scheduledCount += 1;
          if (endMs < now) overdueCount += 1;
        }
      } else {
        historyCount += 1;
        if (
          status === "completed" &&
          o.completed_at &&
          new Date(o.completed_at).getTime() >= startOfWeekMs
        ) {
          completedThisWeekCount += 1;
        }
      }

      return {
        id: o.id,
        topology,
        status,
        deviceId: o.target_ci_id,
        deviceName: device?.name ?? "—",
        deviceLocation: device?.zones?.name ?? null,
        vendorId: o.vendor_id,
        vendorName: vendor?.name ?? "—",
        sponsorId: o.sponsor_id,
        sponsorName: o.sponsor_id ? (sponsorNameMap.get(o.sponsor_id) ?? null) : null,
        maintenanceStart: o.maintenance_start,
        maintenanceEnd: o.maintenance_end,
        madLimitMinutes: o.mad_limit_minutes,
        scope: o.scope,
        switchPort: o.switch_port,
        networkGroup: o.network_group,
        // vendor_mac_address is MACADDR — generated as `unknown`.
        vendorMacAddress: (o.vendor_mac_address as string | null) ?? null,
        authorizedAt: o.authorized_at,
        completedAt: o.completed_at,
        sponsorRemark: o.sponsor_remark,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
      };
    });

    const kpis: OrderListKpis = {
      activeSessions,
      scheduled: scheduledCount,
      overdue: overdueCount,
      completedThisWeek: completedThisWeekCount,
    };
    const counts: OrderSectionCounts = {
      live: liveCount,
      queue: queueCount,
      history: historyCount,
    };

    const context: OrderFormContext = {
      devices: (devicesRes.data ?? []).map((d) => ({
        id: d.id,
        name: d.name,
        zoneName: (d.zones as { name: string } | null)?.name ?? null,
      })),
      vendors: (vendorsRes.data ?? []).map((v) => ({
        id: v.id,
        name: v.name,
        specialization: v.specialization,
      })),
      sponsors: (sponsorsRes.data ?? []).map((s) => ({
        staffRecordId: s.staff_record_id,
        displayName: s.display_name ?? "Unnamed",
        employeeId: s.employee_id,
        roleDisplayName: s.role_display_name,
      })),
    };

    return { rows, kpis, counts, context };
  },
);
